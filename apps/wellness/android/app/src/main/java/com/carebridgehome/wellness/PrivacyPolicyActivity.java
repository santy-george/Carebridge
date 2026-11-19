package com.carebridgehome.wellness;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/**
 * Health Connect opens this when the member taps the privacy policy link in its
 * permission screen. It hands the hosted policy to the browser and closes, so the
 * member sees the policy, not the app's home screen.
 */
public class PrivacyPolicyActivity extends Activity {
  static final String PRIVACY_POLICY_URL = "https://carebridge-wellness.pages.dev/privacy";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    try {
      startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(PRIVACY_POLICY_URL)));
    } catch (ActivityNotFoundException ignored) {
      // No browser installed: nothing useful to show.
    }
    finish();
  }
}
