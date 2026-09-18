package com.vitalis.companion

import android.app.Activity
import android.os.Bundle
import android.widget.TextView

class PermissionsRationaleActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val textView = TextView(this)

        textView.text = getString(R.string.health_data_privacy_message)

        textView.setPadding(48, 48, 48, 48)

        setContentView(textView)
    }
}