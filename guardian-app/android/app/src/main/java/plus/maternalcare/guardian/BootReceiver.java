package plus.maternalcare.guardian;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

/** Restarts the watch after a reboot, but only if it was paired and running. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;
        SharedPreferences prefs =
                context.getSharedPreferences(SosWatchService.PREFS, Context.MODE_PRIVATE);
        if (prefs.getString(SosWatchService.KEY_TOKEN, null) != null) {
            SosWatchService.start(context);
        }
    }
}
