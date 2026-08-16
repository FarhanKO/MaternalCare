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

    private ScheduledExecutorService pool;
    private PowerManager.WakeLock wakeLock;
    private String lastAlertId = null;

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
        startForeground(WATCH_ID, watchNotification());

        PowerManager power = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "guardian:watch");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire();

        pool = Executors.newSingleThreadScheduledExecutor();
        pool.scheduleWithFixedDelay(this::poll, 0, PERIOD_SECONDS, TimeUnit.SECONDS);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // restart if Android kills us for memory — the whole point is to persist
        return START_STICKY;
    }

    private Notification watchNotification() {
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
                .setSmallIcon(android.R.drawable.ic_menu_view)
                .setContentTitle("Guardian is watching")
                .setContentText("You will be alarmed if she needs help.")
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true)
                .setContentIntent(open)
                .build();
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

            if (conn.getResponseCode() != 200) return;

            StringBuilder body = new StringBuilder();
            try (BufferedReader reader =
                         new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) body.append(line);
            }

            JSONObject data = new JSONObject(body.toString()).getJSONObject("data");
            JSONObject alert = data.isNull("alert") ? null : data.getJSONObject("alert");

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
        } catch (Exception ignored) {
            // no connection, server down, malformed reply — try again next tick
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    @Override
    public void onDestroy() {
        if (pool != null) pool.shutdownNow();
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        SosAlarm.stopNoise();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
