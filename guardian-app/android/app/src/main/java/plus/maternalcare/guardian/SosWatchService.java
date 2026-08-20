package plus.maternalcare.guardian;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Watches for an SOS while the app is closed.
 *
 * A foreground service is the honest option here: without Firebase there is
 * no push channel, and Android will not let a background app poll reliably.
 * The persistent notification it requires is a fair trade — it also tells the
 * guardian, truthfully, that the watch is running.
 */
public class SosWatchService extends Service {

    public static final String PREFS = "guardian";
    public static final String KEY_TOKEN = "token";
    public static final String KEY_API = "api";
    public static final String KEY_NAME = "motherName";

    private static final String WATCH_CHANNEL = "sos-watch";
    private static final int WATCH_ID = 4710;
    private static final long PERIOD_SECONDS = 20;

    /** After this many failed checks in a row, stop claiming the watch works. */
    private static final int FAILURES_BEFORE_WARNING = 3;
    /** Long enough for one HTTP round trip, short enough to never leak. */
    private static final long WAKE_MS = 30_000;

    private ScheduledExecutorService pool;
    private PowerManager power;
    private String lastAlertId = null;
    private int consecutiveFailures = 0;
    private boolean warningShown = false;

    public static void start(Context context) {
        Intent intent = new Intent(context, SosWatchService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    public static void stop(Context context) {
        context.stopService(new Intent(context, SosWatchService.class));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        startForeground(WATCH_ID, watchNotification(true));

        // The wake lock is taken per poll, not held for the life of the
        // service. Holding a PARTIAL_WAKE_LOCK permanently keeps the CPU out
        // of deep sleep around the clock and flattens the battery in a day —
        // which ends the watch far more surely than dozing between checks does.
        power = (PowerManager) getSystemService(Context.POWER_SERVICE);

        pool = Executors.newSingleThreadScheduledExecutor();
        pool.scheduleWithFixedDelay(this::tick, 0, PERIOD_SECONDS, TimeUnit.SECONDS);
    }

    /** Wakes the CPU just long enough for one check, then lets it sleep again. */
    private void tick() {
        PowerManager.WakeLock lock = null;
        try {
            if (power != null) {
                lock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "guardian:poll");
                lock.setReferenceCounted(false);
                lock.acquire(WAKE_MS);
            }
            poll();
        } finally {
            if (lock != null && lock.isHeld()) {
                try { lock.release(); } catch (Exception ignored) { }
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // restart if Android kills us for memory — the whole point is to persist
        return START_STICKY;
    }

    /**
     * The permanent notice.
     *
     * `healthy` is not decoration. A watch that cannot reach the server will
     * never alarm, and a guardian reading "You will be alarmed if she needs
     * help" would have no way of knowing. On an SOS app that reassurance is
     * the most dangerous thing on the screen if it is not true, so the text
     * changes the moment the checks start failing.
     */
    private Notification watchNotification(boolean healthy) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager.getNotificationChannel(WATCH_CHANNEL) == null) {
                NotificationChannel channel = new NotificationChannel(
                        WATCH_CHANNEL, "Watching for emergencies",
                        NotificationManager.IMPORTANCE_MIN);
                channel.setDescription("Quiet, permanent notice that the guardian watch is on.");
                channel.setShowBadge(false);
                manager.createNotificationChannel(channel);
            }
        }

        PendingIntent open = PendingIntent.getActivity(
                this, 0, new Intent(this, MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, WATCH_CHANNEL)
                .setSmallIcon(healthy
                        ? android.R.drawable.ic_menu_view
                        : android.R.drawable.stat_notify_error)
                .setContentTitle(healthy
                        ? "Guardian is watching"
                        : "Guardian cannot reach her account")
                .setContentText(healthy
                        ? "You will be alarmed if she needs help."
                        : "Checks are failing — you may not be alerted. Tap to fix.")
                .setPriority(healthy ? NotificationCompat.PRIORITY_MIN : NotificationCompat.PRIORITY_DEFAULT)
                .setOngoing(true)
                .setContentIntent(open)
                .build();
    }

    /** Swap the permanent notice between the healthy and unreachable wording. */
    private void showWatchState(boolean healthy) {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(WATCH_ID, watchNotification(healthy));
    }

    /** One check against the API. Failures are silent — the next tick retries. */
    private void poll() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String token = prefs.getString(KEY_TOKEN, null);
        String api = prefs.getString(KEY_API, null);
        if (token == null || api == null) return;

        HttpURLConnection conn = null;
        try {
            URL url = new URL(api + "/guardian/" + token + "/alert");
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setRequestProperty("Accept", "application/json");

            if (conn.getResponseCode() != 200) { onCheckFailed(); return; }

            StringBuilder body = new StringBuilder();
            try (BufferedReader reader =
                         new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) body.append(line);
            }

            JSONObject data = new JSONObject(body.toString()).getJSONObject("data");
            JSONObject alert = data.isNull("alert") ? null : data.getJSONObject("alert");
            onCheckSucceeded();

            if (alert != null) {
                String id = alert.getString("id");
                if (!id.equals(lastAlertId)) {
                    lastAlertId = id;
                    String name = prefs.getString(KEY_NAME, "She");
                    String where = alert.isNull("location")
                            ? "Location unavailable — call her now."
                            : "Tap to see where she is.";
                    SosAlarm.raise(getApplicationContext(), name, where);
                }
            } else if (lastAlertId != null) {
                lastAlertId = null;
                SosAlarm.standDown(getApplicationContext());
            }
        } catch (Exception e) {
            // no connection, server down, malformed reply — retry next tick,
            // but stop promising the guardian something that is not happening
            onCheckFailed();
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private void onCheckSucceeded() {
        consecutiveFailures = 0;
        if (warningShown) {
            warningShown = false;
            showWatchState(true);
        }
    }

    /**
     * One failure is a tunnel or a dropped packet, not a broken watch. Only a
     * run of them is worth worrying a guardian about.
     */
    private void onCheckFailed() {
        consecutiveFailures += 1;
        if (consecutiveFailures >= FAILURES_BEFORE_WARNING && !warningShown) {
            warningShown = true;
            showWatchState(false);
        }
    }

    @Override
    public void onDestroy() {
        if (pool != null) pool.shutdownNow();
        SosAlarm.stopNoise();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
