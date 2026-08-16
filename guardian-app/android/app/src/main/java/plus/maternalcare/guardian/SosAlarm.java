package plus.maternalcare.guardian;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import androidx.core.app.NotificationCompat;

/**
 * The part a web app cannot do.
 *
 * Audio is played on STREAM_ALARM with USAGE_ALARM, which Android exempts
 * from the ringer switch and from Do Not Disturb — so it sounds even on a
 * silenced phone. The notification carries a full-screen intent, which wakes
 * the device and shows the alert over the lock screen.
 */
public final class SosAlarm {

    public static final String CHANNEL_ID = "sos-emergency";
    public static final int NOTIFICATION_ID = 4711;

    private static MediaPlayer player;
    private static Vibrator vibrator;

    private SosAlarm() {}

    /**
     * The channel must be created with alarm attributes and high importance.
     * Android freezes a channel's settings after creation, so changing this
     * later needs a new channel id.
     */
    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Emergency SOS", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Sounds when the mother you look after raises an SOS.");
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 900});
        channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        channel.setBypassDnd(true);          // ignore Do Not Disturb
        channel.setShowBadge(true);

        AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        channel.setSound(alarmSound(), attributes);

        manager.createNotificationChannel(channel);
    }

    private static Uri alarmSound() {
        Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        return uri;
    }

    /** Full-screen notification that wakes the phone and opens the alert. */
    public static void raise(Context context, String motherName, String detail) {
        ensureChannel(context);

        Intent full = new Intent(context, AlarmActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra("motherName", motherName)
                .putExtra("detail", detail);

        PendingIntent pending = PendingIntent.getActivity(
                context, 0, full,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle(motherName + " needs help")
                .setContentText(detail)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(false)
                .setOngoing(true)
                .setFullScreenIntent(pending, true)   // true = high priority, wakes the screen
                .setContentIntent(pending);

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        manager.notify(NOTIFICATION_ID, builder.build());

        startNoise(context);
    }

    /**
     * Sound and vibration driven directly, rather than left to the channel.
     * The channel's own sound plays once; an emergency needs it to keep going
     * until somebody acts.
     */
    public static synchronized void startNoise(Context context) {
        stopNoise();

        try {
            player = new MediaPlayer();
            player.setDataSource(context, alarmSound());
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            player.setLooping(true);
            player.prepare();

            // push the alarm stream to full — this is the volume the user set
            // for alarms, which is deliberately separate from the ringer
            AudioManager audio = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (audio != null) {
                int max = audio.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                audio.setStreamVolume(AudioManager.STREAM_ALARM, max, 0);
            }
            player.start();
        } catch (Exception e) {
            // a missing ringtone must not stop the vibration or the screen
            player = null;
        }

        vibrator = vibrator(context);
        if (vibrator != null && vibrator.hasVibrator()) {
            long[] pattern = {0, 500, 200, 500, 200, 900, 400};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        }
    }

    public static synchronized void stopNoise() {
        if (player != null) {
            try { player.stop(); player.release(); } catch (Exception ignored) {}
            player = null;
        }
        if (vibrator != null) {
            try { vibrator.cancel(); } catch (Exception ignored) {}
            vibrator = null;
        }
    }

    /** Clears the notification and silences everything. */
    public static void standDown(Context context) {
        stopNoise();
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager != null) manager.cancel(NOTIFICATION_ID);
    }

    private static Vibrator vibrator(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vm =
                    (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return vm == null ? null : vm.getDefaultVibrator();
        }
        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }
}
