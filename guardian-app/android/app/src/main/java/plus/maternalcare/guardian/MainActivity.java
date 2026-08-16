package plus.maternalcare.guardian;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // register before super so the bridge picks the plugin up on first load
        registerPlugin(GuardianPlugin.class);
        super.onCreate(savedInstanceState);
        SosAlarm.ensureChannel(this);
    }
}
