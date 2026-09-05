package plus.maternalcare.guardian;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

/**
 * The screen a full-screen intent opens, over the lock screen.
 *
 * Built in code rather than XML so it cannot fail to inflate — this is the
 * one screen that has to appear no matter what state the app is in.
 */
public class AlarmActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showOverLockScreen();

        String motherName = getIntent().getStringExtra("motherName");
        String detail = getIntent().getStringExtra("detail");
        if (motherName == null) motherName = "She";
        if (detail == null) detail = "Tap to open the app.";

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#BE123C"));
        root.setPadding(56, 56, 56, 56);

        TextView kicker = new TextView(this);
        kicker.setText("EMERGENCY");
        kicker.setTextColor(Color.parseColor("#FFD6DE"));
        kicker.setTextSize(14);
        kicker.setLetterSpacing(0.3f);
        kicker.setGravity(Gravity.CENTER);

        TextView title = new TextView(this);
        title.setText(motherName + " needs help");
        title.setTextColor(Color.WHITE);
        title.setTextSize(30);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, 24, 0, 12);

        TextView body = new TextView(this);
        body.setText(detail);
        body.setTextColor(Color.parseColor("#FFE4E9"));
        body.setTextSize(16);
        body.setGravity(Gravity.CENTER);

        Button open = new Button(this);
        open.setText("Open Guardian");
        open.setAllCaps(false);
        open.setTextSize(18);
        open.setOnClickListener(v -> {
            SosAlarm.standDown(this);
            startActivity(new Intent(this, MainActivity.class)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
            finish();
        });

        Button silence = new Button(this);
        silence.setText("Turn off alarm");
        silence.setAllCaps(false);
        silence.setOnClickListener(v -> {
            SosAlarm.standDown(this);
            finish();
        });

        LinearLayout.LayoutParams gap =
                new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT);
        gap.setMargins(0, 40, 0, 0);

        root.addView(kicker);
        root.addView(title);
        root.addView(body);
        root.addView(open, gap);
        root.addView(silence);
        setContentView(root);
    }

    /** Wake the device and draw above the keyguard. */
    private void showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguard = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguard != null) keyguard.requestDismissKeyguard(this, null);
        } else {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                            | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    protected void onDestroy() {
        SosAlarm.stopNoise();
        super.onDestroy();
    }
}
