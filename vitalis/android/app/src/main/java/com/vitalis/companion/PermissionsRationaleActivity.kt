package com.vitalis.companion

import android.os.Bundle
import android.widget.TextView
import androidx.activity.ComponentActivity

class PermissionsRationaleActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val textView = TextView(this).apply {
            text = getString(
                R.string.health_permissions_rationale
            )

            setPadding(
                40,
                40,
                40,
                40
            )
        }

        setContentView(textView)
    }
}