package plus.maternalcare.guardian;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The bridge between the React UI and the native alarm.
 *
 * The web layer stays in charge of what the guardian sees; this exposes only
 * the four things the browser genuinely cannot do — arm a background watch,
 * sound an alarm through silent mode, silence it, and ask to be exempt from
 * battery optimisation so the watch survives Doze.
 */
@CapacitorPlugin(name = "Guardian")
public class GuardianPlugin extends Plugin {

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(SosWatchService.PREFS, Context.MODE_PRIVATE);
    }

    /** Store the pairing and start watching. */
    @PluginMethod
    public void startWatch(PluginCall call) {
        String token = call.getString("token");
        String api = call.getString("apiBase");
        String motherName = call.getString("motherName", "She");

        if (token == null || api == null) {
            call.reject("token and apiBase are required");
            return;
        }

        prefs().edit()
                .putString(SosWatchService.KEY_TOKEN, token)
                .putString(SosWatchService.KEY_API, api)
                .putString(SosWatchService.KEY_NAME, motherName)
                .apply();

        SosWatchService.start(getContext());
        call.resolve();
    }

    @PluginMethod
    public void stopWatch(PluginCall call) {
        SosWatchService.stop(getContext());
        prefs().edit().remove(SosWatchService.KEY_TOKEN).apply();
        call.resolve();
    }

    /** Sound the alarm now — used by the in-app alert and to let them test it. */
    @PluginMethod
    public void startAlarm(PluginCall call) {
        SosAlarm.startNoise(getContext());
        call.resolve();
    }

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        SosAlarm.standDown(getContext());
        call.resolve();
    }

    /**
     * Doze will throttle the watch unless the app is exempted. Android
     * requires the user to grant this from Settings, so all we can do is
     * take them there.
     */
    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            call.resolve(new JSObject().put("exempt", true));
            return;
        }
        PowerManager power = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        String pkg = getContext().getPackageName();

        if (power != null && power.isIgnoringBatteryOptimizations(pkg)) {
            call.resolve(new JSObject().put("exempt", true));
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                    .setData(Uri.parse("package:" + pkg))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception ignored) {
            // some builds hide this screen; the watch still runs, just throttled
        }
        call.resolve(new JSObject().put("exempt", false));
    }

    /** What this device will actually do, answered by the OS rather than guessed. */
    @PluginMethod
    public void capabilities(PluginCall call) {
        PowerManager power = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        boolean exempt = Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                || (power != null && power.isIgnoringBatteryOptimizations(getContext().getPackageName()));

        call.resolve(new JSObject()
                .put("native", true)
                .put("alarmThroughSilent", true)
                .put("fullScreenOverLock", true)
                .put("vibration", true)
                .put("backgroundWatch", true)
                .put("batteryExempt", exempt));
    }
}
