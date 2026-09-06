package com.vitalis.companion

import android.os.Bundle
import android.widget.TextView
import androidx.activity.ComponentActivity

class OnboardingActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val textView = TextView(this)
        textView.text = "VITALIS Health Connect"
        setContentView(textView)
    }
}