package com.vitalis.companion

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class NoiseFitNotificationService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName

        if (!packageName.contains("noise", ignoreCase = true)) {
            return
        }

        val notification = sbn.notification
        val extras = notification.extras

        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""

        val content = "$title $text $bigText"

        Log.d("VITALIS_NOTIFY", "NOTIFICATION: $content")

        parseHealthData(content)
    }

    private fun parseHealthData(content: String) {

        val heartRate = Regex(
            "(?i)(heart\\s*rate|hr|bpm)\\s*[:=]?\\s*(\\d{2,3})"
        ).find(content)?.groupValues?.get(2)?.toIntOrNull()

        val spo2 = Regex(
            "(?i)(spo2|spO2|oxygen|blood\\s*oxygen)\\s*[:=]?\\s*(\\d{2,3})\\s*%?"
        ).find(content)?.groupValues?.get(2)?.toIntOrNull()

        val systolic = Regex(
            "(?i)(blood\\s*pressure|bp)\\s*[:=]?\\s*(\\d{2,3})\\s*/"
        ).find(content)?.groupValues?.get(2)?.toIntOrNull()

        val diastolic = Regex(
            "(?i)(blood\\s*pressure|bp)\\s*[:=]?\\s*\\d{2,3}\\s*/\\s*(\\d{2,3})"
        ).find(content)?.groupValues?.get(2)?.toIntOrNull()

        if (heartRate != null) {
            Log.d("VITALIS_HEALTH", "HR=$heartRate")
        }

        if (spo2 != null) {
            Log.d("VITALIS_HEALTH", "SPO2=$spo2")
        }

        if (systolic != null && diastolic != null) {
            Log.d(
                "VITALIS_HEALTH",
                "BP=$systolic/$diastolic"
            )
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
    }
}