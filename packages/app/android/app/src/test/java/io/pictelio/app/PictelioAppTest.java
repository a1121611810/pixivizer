package io.pictelio.app;

import static org.junit.Assert.*;

import android.content.Context;
import android.webkit.WebView;

import androidx.test.core.app.ApplicationProvider;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.Implements;
import org.robolectric.annotation.Implementation;

/**
 * Behavioral tests for PictelioApp WebView warmup.
 *
 * Seam C (exception resilience): warmUpWebView() must silently catch
 *   all exceptions and never propagate.
 * Seam D (warmup execution): onCreate() must complete without crashing.
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 28, application = PictelioApp.class)
public class PictelioAppTest {

    @Test
    public void appStartsWithoutCrash_whenWarmupSucceeds() {
        PictelioApp app = (PictelioApp) ApplicationProvider.getApplicationContext();

        assertNotNull(app);
    }

    @Test
    @Config(shadows = FailingWebViewShadow.class)
    public void appStartsWithoutCrash_whenWarmupThrows() {
        // When WebView constructor throws, warmUpWebView() must catch silently
        PictelioApp app = (PictelioApp) ApplicationProvider.getApplicationContext();

        assertNotNull(app);
    }

    /**
     * Robolectric shadow that makes WebView(Context) constructor throw.
     * Used to verify exception resilience of warmUpWebView().
     */
    @Implements(WebView.class)
    public static class FailingWebViewShadow {

        @Implementation
        protected void __constructor__(Context context) {
            throw new RuntimeException("Simulated WebView constructor failure");
        }
    }
}
