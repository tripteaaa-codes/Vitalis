@file:Suppress("SpellCheckingInspection")

package com.vitalis.companion

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognizerIntent
import android.speech.tts.TextToSpeech
import android.text.method.ScrollingMovementMethod
import android.util.Log
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import java.util.Locale
import java.util.UUID

@SuppressLint("MissingPermission", "SetTextI18n")
class MainActivity : ComponentActivity() {

    companion object {

        private const val WATCH_ADDRESS = "04:CA:8F:3C:8F:E9"

        private val NOTIFICATION_UUID = UUID.fromString(
            "16186f01-0000-1000-8000-00807f9b34fb"
        )

        private val COMMAND_UUID = UUID.fromString(
            "16186f02-0000-1000-8000-00807f9b34fb"
        )

        private val NOTIFICATION_UUID_03 = UUID.fromString(
            "16186f03-0000-1000-8000-00807f9b34fb"
        )

        private val NOTIFICATION_UUID_04 = UUID.fromString(
            "16186f04-0000-1000-8000-00807f9b34fb"
        )

        private val NOTIFICATION_UUID_05 = UUID.fromString(
            "16186f05-0000-1000-8000-00807f9b34fb"
        )

        private val SECONDARY_NOTIFY_UUID = UUID.fromString(
            "0000aa03-0000-1000-8000-00805f9b34fb"
        )

        private val CLIENT_CONFIG_UUID = UUID.fromString(
            "00002902-0000-1000-8000-00805f9b34fb"
        )

        private const val WRITE_TYPE =
            BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
    }

    private enum class DemoScenario(
        val label: String,
        val heartRate: Int,
        val spo2: Int,
        val bloodPressure: String,
        val riskSummary: String,
        val recommendedAction: String
    ) {
        GOOD(
            "GOOD", 72, 98, "118/76",
            "Normal vital-sign profile",
            "Continue routine monitoring"
        ),
        MODERATE(
            "MODERATE", 88, 96, "128/82",
            "Moderate monitoring profile",
            "Recheck readings after rest"
        ),
        ELEVATED(
            "ELEVATED", 104, 93, "142/91",
            "Elevated vital-sign profile",
            "Monitor closely and arrange follow-up"
        ),
        HIGH_RISK(
            "HIGH RISK", 124, 89, "168/104",
            "High-risk demonstration profile",
            "Escalate through the configured care workflow"
        )
    }

    private val handler =
        Handler(Looper.getMainLooper())

    private var bluetoothGatt: BluetoothGatt? = null
    private var bluetoothDevice: BluetoothDevice? = null

    private var scanAttempt = 0
    private var notificationsReady = false
    private var protocolStarted = false
    private var realtimeAttempts = 0

    private var notificationCharacteristics =
        mutableListOf<BluetoothGattCharacteristic>()

    private var notificationIndex = 0
    private var notificationSetupRunning = false

    private var heartRateLive = false
    private var spo2Live = false
    private var stepsLive = false
    private var caloriesLive = false
    private var distanceLive = false
    private var pressureLive = false

    private lateinit var textToSpeech: TextToSpeech

    private lateinit var statusText: TextView
    private lateinit var dataSourceText: TextView
    private lateinit var simulatorButton: Button
    private lateinit var healthRatingText: TextView

    private lateinit var heartRateText: TextView
    private lateinit var spo2Text: TextView
    private lateinit var stepsText: TextView
    private lateinit var caloriesText: TextView
    private lateinit var distanceText: TextView
    private lateinit var pressureText: TextView

    private lateinit var logText: TextView
    private lateinit var logScroll: ScrollView

    private var simulatorMode = false
    private var demoScenarioIndex = -1

    private val permissionLauncher =
        registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { permissions ->

            val connect =
                permissions[
                    Manifest.permission.BLUETOOTH_CONNECT
                ] == true

            val scan =
                permissions[
                    Manifest.permission.BLUETOOTH_SCAN
                ] == true

            if (connect && scan) {
                startWatchScan()
            } else {
                log(
                    getString(
                        R.string.bluetooth_permission_denied
                    )
                )
            }
        }

    private val speechLauncher =
        registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) { result ->

            if (result.resultCode != RESULT_OK) {

                speak(
                    getString(
                        R.string.voice_not_heard
                    )
                )

                return@registerForActivityResult
            }

            val data = result.data

            val results =
                data?.getStringArrayListExtra(
                    RecognizerIntent.EXTRA_RESULTS
                )

            val command =
                results
                    ?.firstOrNull()
                    ?.lowercase(
                        Locale.getDefault()
                    )
                    ?: ""

            log(
                "VOICE COMMAND: $command"
            )

            when {

                command.contains("health") ||
                        command.contains("status") -> {

                    speakHealthStatus()
                }

                command.contains("heart") -> {

                    speakHeartRate()
                }

                command.contains("oxygen") ||
                        command.contains("spo2") -> {

                    speakSpO2()
                }

                command.contains("step") -> {

                    speakSteps()
                }

                command.contains("calorie") -> {

                    speakCalories()
                }

                command.contains("distance") -> {

                    speakDistance()
                }

                command.contains("pressure") -> {

                    speakPressure()
                }

                command.contains("emergency") ||
                        command.contains("sos") -> {

                    startEmergencyMode()
                }

                else -> {

                    speak(
                        getString(
                            R.string.voice_unknown_command
                        )
                    )
                }
            }
        }

    private val scanCallback =
        object : ScanCallback() {

            override fun onScanResult(
                callbackType: Int,
                result: ScanResult
            ) {

                val device =
                    result.device

                val address =
                    device.address

                val name =
                    result.scanRecord?.deviceName
                        ?: device.name
                        ?: getString(
                            R.string.unknown_device
                        )

                log(
                    getString(
                        R.string.ble_device,
                        name,
                        address,
                        result.rssi
                    )
                )

                if (
                    address.equals(
                        WATCH_ADDRESS,
                        ignoreCase = true
                    ) ||
                    name.contains(
                        "NF 2",
                        ignoreCase = true
                    ) ||
                    name.contains(
                        "Noise",
                        ignoreCase = true
                    )
                ) {

                    stopWatchScan()

                    bluetoothDevice =
                        device

                    log(
                        getString(
                            R.string.noise_watch_found
                        )
                    )

                    log(
                        getString(
                            R.string.address,
                            address
                        )
                    )

                    connectToDiscoveredWatch(
                        device
                    )
                }
            }

            override fun onScanFailed(
                errorCode: Int
            ) {

                log(
                    getString(
                        R.string.scan_failed,
                        errorCode
                    )
                )

                retryConnection()
            }
        }

    override fun onCreate(
        savedInstanceState: Bundle?
    ) {

        super.onCreate(
            savedInstanceState
        )

        textToSpeech =
            TextToSpeech(this) { result ->

                if (
                    result ==
                    TextToSpeech.SUCCESS
                ) {

                    textToSpeech.language =
                        Locale.US
                }
            }

        createUi()
    }

    private fun createUi() {

        val layout =
            LinearLayout(this)

        layout.orientation =
            LinearLayout.VERTICAL

        layout.setPadding(
            30,
            30,
            30,
            30
        )

        val title =
            TextView(this)

        title.text =
            getString(
                R.string.app_title
            )

        title.textSize = 26f

        statusText =
            TextView(this)

        statusText.text =
            getString(
                R.string.disconnected
            )

        statusText.textSize = 18f

        dataSourceText =
            TextView(this)

        dataSourceText.text =
            "DATA SOURCE: WAITING FOR WATCH"

        dataSourceText.textSize = 15f

        dataSourceText.setPadding(
            0,
            4,
            0,
            12
        )

        val connectButton =
            Button(this)

        connectButton.text =
            getString(
                R.string.connect
            )

        connectButton.setOnClickListener {
            requestBluetoothPermission()
        }

        val voiceButton =
            Button(this)

        voiceButton.text =
            getString(
                R.string.voice_assistant
            )

        voiceButton.setOnClickListener {
            startVoiceAssistant()
        }

        val clearButton =
            Button(this)

        clearButton.text =
            getString(
                R.string.clear
            )

        clearButton.setOnClickListener {
            logText.text = ""
        }

        simulatorButton =
            Button(this)

        simulatorButton.text =
            "START SIMULATOR: GOOD"

        simulatorButton.setOnClickListener {
            showNextDemoScenario()
        }

        healthRatingText =
            createReadingText(
                "Health Rating: WAITING FOR READINGS"
            )

        heartRateText =
            createReadingText(
                getString(
                    R.string.heart_rate_default
                )
            )

        spo2Text =
            createReadingText(
                getString(
                    R.string.spo2_default
                )
            )

        stepsText =
            createReadingText(
                getString(
                    R.string.steps_default
                )
            )

        caloriesText =
            createReadingText(
                getString(
                    R.string.calories_default
                )
            )

        distanceText =
            createReadingText(
                getString(
                    R.string.distance_default
                )
            )

        pressureText =
            createReadingText(
                getString(
                    R.string.pressure_default
                )
            )

        logText =
            TextView(this)

        logText.textSize = 13f

        logText.setPadding(
            10,
            10,
            10,
            10
        )

        logText.movementMethod =
            ScrollingMovementMethod()

        logScroll =
            ScrollView(this)

        logScroll.layoutParams =
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )

        logScroll.isFillViewport =
            true

        logScroll.isVerticalScrollBarEnabled =
            true

        logScroll.addView(
            logText
        )

        layout.addView(title)
        layout.addView(statusText)
        layout.addView(dataSourceText)

        layout.addView(connectButton)
        layout.addView(voiceButton)
        layout.addView(clearButton)
        layout.addView(simulatorButton)

        layout.addView(heartRateText)
        layout.addView(spo2Text)
        layout.addView(stepsText)
        layout.addView(caloriesText)
        layout.addView(distanceText)
        layout.addView(pressureText)
        layout.addView(healthRatingText)

        layout.addView(logScroll)

        setContentView(layout)
    }

    private fun createReadingText(
        text: String
    ): TextView {

        return TextView(this).apply {

            this.text = text

            textSize = 20f

            setPadding(
                10,
                8,
                10,
                8
            )
        }
    }

    private fun showNextDemoScenario() {

        demoScenarioIndex =
            (demoScenarioIndex + 1) %
                    DemoScenario.entries.size

        val scenario =
            DemoScenario.entries[demoScenarioIndex]

        simulatorMode = true

        heartRateText.text =
            "Heart Rate: ${scenario.heartRate} BPM"

        spo2Text.text =
            "SpO₂: ${scenario.spo2}%"

        pressureText.text =
            "Blood Pressure: ${scenario.bloodPressure} mmHg"

        healthRatingText.text =
            "Health Rating: ${scenario.label}\n" +
                    "Assessment: ${scenario.riskSummary}\n" +
                    "Action: ${scenario.recommendedAction}\n" +
                    "Demo data only — not a medical diagnosis"

        dataSourceText.text =
            "DATA SOURCE: SIMULATOR • ${scenario.label}"

        simulatorButton.text =
            "SIMULATOR: ${scenario.label} (TAP FOR NEXT)"

        log(
            "SIMULATOR SCENARIO: ${scenario.label}"
        )
    }

    private fun leaveSimulatorMode() {

        if (!simulatorMode) return

        simulatorMode = false
        demoScenarioIndex = -1
        simulatorButton.text =
            "START SIMULATOR: GOOD"
        healthRatingText.text =
            "Health Rating: LIVE BLE DATA"

        log("SIMULATOR OFF: CONNECTING TO LIVE BLE DATA")
    }

    private fun startVoiceAssistant() {

        speak(
            getString(
                R.string.voice_listening
            )
        )

        val intent =
            Intent(
                RecognizerIntent.ACTION_RECOGNIZE_SPEECH
            )

        intent.putExtra(
            RecognizerIntent.EXTRA_LANGUAGE_MODEL,
            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
        )

        intent.putExtra(
            RecognizerIntent.EXTRA_LANGUAGE,
            Locale.getDefault()
        )

        try {

            speechLauncher.launch(
                intent
            )

        } catch (_: Exception) {

            speak(
                getString(
                    R.string.voice_unavailable
                )
            )
        }
    }

    private fun speakHealthStatus() {

        val message =
            getString(
                R.string.voice_health_status,
                heartRateText.text.toString(),
                spo2Text.text.toString(),
                stepsText.text.toString(),
                caloriesText.text.toString(),
                distanceText.text.toString(),
                pressureText.text.toString()
            )

        speak(message)
    }

    private fun speakHeartRate() {
        speak(heartRateText.text.toString())
    }

    private fun speakSpO2() {
        speak(spo2Text.text.toString())
    }

    private fun speakSteps() {
        speak(stepsText.text.toString())
    }

    private fun speakCalories() {
        speak(caloriesText.text.toString())
    }

    private fun speakDistance() {
        speak(distanceText.text.toString())
    }

    private fun speakPressure() {
        speak(pressureText.text.toString())
    }

    private fun startEmergencyMode() {

        log(
            getString(
                R.string.voice_sos_request
            )
        )

        speak(
            getString(
                R.string.emergency_confirmation
            )
        )
    }

    private fun speak(
        message: String
    ) {

        textToSpeech.speak(
            message,
            TextToSpeech.QUEUE_FLUSH,
            null,
            "VITALIS"
        )
    }

    private fun requestBluetoothPermission() {

        val connect =
            checkSelfPermission(
                Manifest.permission.BLUETOOTH_CONNECT
            ) ==
                    PackageManager.PERMISSION_GRANTED

        val scan =
            checkSelfPermission(
                Manifest.permission.BLUETOOTH_SCAN
            ) ==
                    PackageManager.PERMISSION_GRANTED

        if (
            connect &&
            scan
        ) {

            startWatchScan()

        } else {

            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.BLUETOOTH_SCAN,
                    Manifest.permission.BLUETOOTH_CONNECT
                )
            )
        }
    }

    private fun startWatchScan() {

        try {

            leaveSimulatorMode()

            val manager =
                getSystemService(
                    BluetoothManager::class.java
                )

            val adapter =
                manager?.adapter

            if (
                adapter == null
            ) {

                log(
                    getString(
                        R.string.bluetooth_unavailable
                    )
                )

                return
            }

            if (
                !adapter.isEnabled
            ) {

                log(
                    getString(
                        R.string.bluetooth_disabled
                    )
                )

                return
            }

            stopWatchScan()

            bluetoothGatt?.close()

            bluetoothGatt = null

            val device =
                adapter.getRemoteDevice(
                    WATCH_ADDRESS
                )

            bluetoothDevice =
                device

            resetLiveDataState()

            statusText.text =
                getString(
                    R.string.connecting
                )

            dataSourceText.text =
                "DATA SOURCE: CONNECTING TO BLE WATCH"

            log(
                getString(
                    R.string.connecting_noise_watch
                )
            )

            log(
                getString(
                    R.string.watch_address,
                    device.address
                )
            )

            @Suppress("DEPRECATION")
            bluetoothGatt =
                device.connectGatt(
                    this,
                    false,
                    callback,
                    BluetoothDevice.TRANSPORT_LE
                )

        } catch (
            exception: SecurityException
        ) {

            log(
                getString(
                    R.string.bluetooth_error,
                    exception.message ?: ""
                )
            )

        } catch (
            exception: IllegalArgumentException
        ) {

            log(
                getString(
                    R.string.invalid_bluetooth_address,
                    exception.message ?: ""
                )
            )
        }
    }

    private fun stopWatchScan() {

        try {

            val scanner =
                getSystemService(
                    BluetoothManager::class.java
                )
                    ?.adapter
                    ?.bluetoothLeScanner

            scanner?.stopScan(
                scanCallback
            )

        } catch (
            exception: SecurityException
        ) {

            log(
                getString(
                    R.string.bluetooth_error,
                    exception.message ?: ""
                )
            )
        }
    }

    @Suppress("DEPRECATION")
    private fun connectToDiscoveredWatch(
        device: BluetoothDevice
    ) {

        try {

            bluetoothGatt?.close()

            bluetoothGatt = null

            notificationsReady = false
            protocolStarted = false
            realtimeAttempts = 0

            notificationCharacteristics.clear()
            notificationIndex = 0
            notificationSetupRunning = false

            resetLiveDataState()

            statusText.text =
                getString(
                    R.string.connecting
                )

            dataSourceText.text =
                "DATA SOURCE: CONNECTING TO BLE WATCH"

            log(
                getString(
                    R.string.connecting_discovered_watch
                )
            )

            bluetoothGatt =
                device.connectGatt(
                    this,
                    false,
                    callback,
                    BluetoothDevice.TRANSPORT_LE
                )

        } catch (
            exception: SecurityException
        ) {

            log(
                getString(
                    R.string.bluetooth_error,
                    exception.message ?: ""
                )
            )

            retryConnection()
        }
    }

    private val callback =
        object : BluetoothGattCallback() {

            override fun onConnectionStateChange(
                gatt: BluetoothGatt,
                status: Int,
                newState: Int
            ) {

                runOnUiThread {

                    when (newState) {

                        BluetoothProfile.STATE_CONNECTED -> {

                            scanAttempt = 0

                            statusText.text =
                                getString(
                                    R.string.connected
                                )

                            dataSourceText.text =
                                "DATA SOURCE: LIVE BLE • WAITING FOR HEALTH DATA"

                            log(
                                getString(
                                    R.string.connected_status,
                                    status
                                )
                            )

                            handler.postDelayed(
                                {

                                    try {

                                        gatt.discoverServices()

                                    } catch (
                                        exception: SecurityException
                                    ) {

                                        log(
                                            getString(
                                                R.string.bluetooth_error,
                                                exception.message ?: ""
                                            )
                                        )
                                    }

                                },
                                500
                            )
                        }

                        BluetoothProfile.STATE_DISCONNECTED -> {

                            statusText.text =
                                getString(
                                    R.string.disconnected
                                )

                            dataSourceText.text =
                                "DATA SOURCE: WATCH DISCONNECTED"

                            log(
                                getString(
                                    R.string.disconnected_status,
                                    status
                                )
                            )

                            if (
                                gatt ==
                                bluetoothGatt
                            ) {

                                bluetoothGatt?.close()

                                bluetoothGatt = null

                                notificationsReady = false
                                protocolStarted = false
                                realtimeAttempts = 0

                                notificationCharacteristics.clear()
                                notificationIndex = 0
                                notificationSetupRunning = false

                                resetLiveDataState()

                                retryConnection()
                            }
                        }
                    }
                }
            }

            override fun onServicesDiscovered(
                gatt: BluetoothGatt,
                status: Int
            ) {

                runOnUiThread {

                    log(
                        getString(
                            R.string.services_discovered,
                            status
                        )
                    )

                    if (
                        status ==
                        BluetoothGatt.GATT_SUCCESS
                    ) {

                        findNoiseCharacteristics(
                            gatt
                        )
                    }
                }
            }

            override fun onCharacteristicChanged(
                gatt: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic,
                value: ByteArray
            ) {

                logPacket(
                    characteristic.uuid,
                    value
                )
            }

            @Deprecated(
                "Deprecated in Android API 33"
            )
            @Suppress("DEPRECATION")
            override fun onCharacteristicChanged(
                gatt: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic
            ) {

                logPacket(
                    characteristic.uuid,
                    characteristic.value
                )
            }

            override fun onDescriptorWrite(
                gatt: BluetoothGatt,
                descriptor: BluetoothGattDescriptor,
                status: Int
            ) {

                log(
                    getString(
                        R.string.descriptor_write,
                        descriptor.characteristic.uuid,
                        status
                    )
                )

                notificationIndex++

                enableNextNotification(
                    gatt
                )
            }
        }

    private fun findNoiseCharacteristics(
        gatt: BluetoothGatt
    ) {

        var notificationFound = false
        var commandFound = false

        notificationCharacteristics.clear()

        log(
            getString(
                R.string.searching_noise_characteristics
            )
        )

        for (
        service in gatt.services
        ) {

            log(
                getString(
                    R.string.service,
                    service.uuid
                )
            )

            for (
            characteristic in service.characteristics
            ) {

                log(
                    getString(
                        R.string.characteristic,
                        characteristic.uuid
                    )
                )

                val properties =
                    characteristic.properties

                val supportsNotify =
                    properties and
                            BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0

                val supportsIndicate =
                    properties and
                            BluetoothGattCharacteristic.PROPERTY_INDICATE != 0

                if (
                    characteristic.uuid ==
                    NOTIFICATION_UUID
                ) {

                    notificationFound = true

                    log(
                        getString(
                            R.string.notification_characteristic_found
                        )
                    )
                }

                if (
                    characteristic.uuid ==
                    COMMAND_UUID
                ) {

                    commandFound = true

                    log(
                        getString(
                            R.string.command_characteristic_found
                        )
                    )
                }

                if (
                    supportsNotify ||
                    supportsIndicate
                ) {

                    if (
                        characteristic.uuid ==
                        NOTIFICATION_UUID ||
                        characteristic.uuid ==
                        COMMAND_UUID ||
                        characteristic.uuid ==
                        NOTIFICATION_UUID_03 ||
                        characteristic.uuid ==
                        NOTIFICATION_UUID_04 ||
                        characteristic.uuid ==
                        NOTIFICATION_UUID_05 ||
                        characteristic.uuid ==
                        SECONDARY_NOTIFY_UUID
                    ) {

                        if (
                            !notificationCharacteristics.contains(
                                characteristic
                            )
                        ) {

                            notificationCharacteristics.add(
                                characteristic
                            )
                        }

                        log(
                            "NOTIFICATION CHANNEL FOUND: ${characteristic.uuid}"
                        )
                    }
                }
            }
        }

        if (
            notificationFound &&
            commandFound
        ) {

            log(
                getString(
                    R.string.noise_protocol_detected
                )
            )

        } else {

            log(
                getString(
                    R.string.noise_protocol_incomplete
                )
            )
        }

        log(
            "TOTAL NOTIFICATION CHANNELS: ${notificationCharacteristics.size}"
        )

        notificationIndex = 0

        if (
            notificationCharacteristics.isNotEmpty()
        ) {

            notificationSetupRunning = true

            enableNextNotification(
                gatt
            )

        } else {

            log(
                "NO NOTIFICATION CHANNELS FOUND"
            )
        }
    }

    @Suppress("DEPRECATION")
    private fun enableNextNotification(
        gatt: BluetoothGatt
    ) {

        if (
            notificationIndex >=
            notificationCharacteristics.size
        ) {

            notificationSetupRunning = false
            notificationsReady = true

            log(
                "ALL NOTIFICATION CHANNELS ENABLED"
            )

            log(
                getString(
                    R.string.notifications_enabled
                )
            )

            handler.postDelayed(
                {
                    startNoiseProtocol()
                },
                300
            )

            return
        }

        val characteristic =
            notificationCharacteristics[
                notificationIndex
            ]

        try {

            val localEnabled =
                gatt.setCharacteristicNotification(
                    characteristic,
                    true
                )

            log(
                "ENABLE NOTIFY ${characteristic.uuid} LOCAL=$localEnabled"
            )

            val descriptor =
                characteristic.getDescriptor(
                    CLIENT_CONFIG_UUID
                )

            if (
                descriptor == null
            ) {

                "NO CCCD FOR ${characteristic.uuid}"

                notificationIndex++

                handler.postDelayed(
                    {
                        enableNextNotification(
                            gatt
                        )
                    },
                    100
                )

                return
            }

            if (
                Build.VERSION.SDK_INT >= 33
            ) {

                gatt.writeDescriptor(
                    descriptor,
                    BluetoothGattDescriptor
                        .ENABLE_NOTIFICATION_VALUE
                )

            } else {

                descriptor.value =
                    BluetoothGattDescriptor
                        .ENABLE_NOTIFICATION_VALUE

                gatt.writeDescriptor(
                    descriptor
                )
            }

        } catch (
            exception: SecurityException
        ) {

            log(
                getString(
                    R.string.bluetooth_error,
                    exception.message ?: ""
                )
            )

            notificationIndex++

            handler.postDelayed(
                {
                    enableNextNotification(
                        gatt
                    )
                },
                100
            )
        }
    }

    private fun startNoiseProtocol() {

        if (
            protocolStarted
        ) {
            return
        }

        if (
            !notificationsReady
        ) {

            log(
                getString(
                    R.string.protocol_not_ready
                )
            )

            return
        }

        protocolStarted = true

        log(
            getString(
                R.string.starting_noise_protocol
            )
        )

        sendPing {

            log(
                getString(
                    R.string.ping_completed
                )
            )

            handler.postDelayed(
                {
                    sendProtocolInit()
                },
                400
            )
        }
    }

    private fun sendPing(
        completed: (() -> Unit)? = null
    ) {

        val command =
            getCommandCharacteristic()

        val notification =
            getNotificationCharacteristic()

        if (
            command == null ||
            notification == null
        ) {

            log(
                getString(
                    R.string.ping_failed
                )
            )

            return
        }

        val ping =
            byteArrayOf(
                0x00,
                0x00,
                0x00,
                0x00,
                0x01,
                0x00
            )

        val ackOk =
            byteArrayOf(
                0x00,
                0x00,
                0x01,
                0x01,
                0x00,
                0x00
            )

        log(
            getString(
                R.string.tx_ping,
                hex(ping)
            )
        )

        writeCommand(
            command,
            ping
        )

        handler.postDelayed(
            {

                log(
                    "STARTUP ACK_OK TX: ${hex(ackOk)}"
                )

                writeAck(
                    notification,
                    ackOk
                )

                handler.postDelayed(
                    {
                        completed?.invoke()
                    },
                    200
                )

            },
            400
        )
    }

    private fun sendProtocolInit() {

        log(
            getString(
                R.string.protocol_initialization
            )
        )

        val opcodes =
            intArrayOf(
                0x00,
                0x10,
                0x11,
                0x12,
                0x13,
                0x21,
                0x20,
                0x22
            )

        sendOpcodeSequence(
            opcodes,
            0
        )
    }

    private fun sendOpcodeSequence(
        opcodes: IntArray,
        index: Int
    ) {

        if (
            index >= opcodes.size
        ) {

            sendTimeSync()

            return
        }

        sendFrame(
            opcodes[index],
            byteArrayOf()
        ) {

            handler.postDelayed(
                {
                    sendOpcodeSequence(
                        opcodes,
                        index + 1
                    )
                },
                150
            )
        }
    }

    private fun sendTimeSync() {

        val unixSeconds =
            System.currentTimeMillis() / 1000L

        val time =
            byteArrayOf(
                (unixSeconds and 0xFF).toByte(),
                ((unixSeconds shr 8) and 0xFF).toByte(),
                ((unixSeconds shr 16) and 0xFF).toByte(),
                ((unixSeconds shr 24) and 0xFF).toByte()
            )

        log(
            getString(
                R.string.time_sync
            )
        )

        sendFrame(
            0x30,
            time
        ) {

            handler.postDelayed(
                {
                    realtimeAttempts = 0
                    startRealtimeData()
                },
                1000
            )
        }
    }

    private fun startRealtimeData() {

        val command =
            getCommandCharacteristic()

        val notification =
            getNotificationCharacteristic()

        if (
            command == null
        ) {

            log(
                getString(
                    R.string.command_unavailable,
                    "REALTIME"
                )
            )

            return
        }

        if (
            notification == null
        ) {

            log(
                "REALTIME ACK CHARACTERISTIC NOT FOUND"
            )

            return
        }

        realtimeAttempts++

        val packet =
            byteArrayOf(
                0x66,
                0x66,
                0x48,
                0x5A,
                0x00,
                0x01,
                0x03,
                0x08,
                0x00,
                0x08,
                0x08,
                0x10,
                0x04,
                0x5A,
                0x02,
                0x18,
                0x00
            )

        val ping =
            byteArrayOf(
                0x00,
                0x00,
                0x00,
                0x00,
                0x01,
                0x00
            )

        val ackOk =
            byteArrayOf(
                0x00,
                0x00,
                0x01,
                0x01,
                0x00,
                0x00
            )

        val ackEnd =
            byteArrayOf(
                0x00,
                0x00,
                0x01,
                0x00,
                0x00,
                0x00
            )

        log(
            "REALTIME HANDSHAKE ATTEMPT $realtimeAttempts"
        )

        log(
            "PRE-PING TX: ${hex(ping)}"
        )

        writeCommand(
            command,
            ping
        )

        handler.postDelayed(
            {

                log(
                    "REALTIME COMMAND TX: ${hex(packet)}"
                )

                writeCommand(
                    command,
                    packet
                )

                handler.postDelayed(
                    {

                        log(
                            "ACK_OK TX: ${hex(ackOk)}"
                        )

                        writeAck(
                            notification,
                            ackOk
                        )

                        handler.postDelayed(
                            {

                                log(
                                    "ACK_END TX: ${hex(ackEnd)}"
                                )

                                writeAck(
                                    notification,
                                    ackEnd
                                )

                                handler.postDelayed(
                                    {

                                        log(
                                            "REALTIME HANDSHAKE COMPLETE"
                                        )

                                    },
                                    100
                                )

                            },
                            30
                        )

                    },
                    80
                )

            },
            150
        )

        if (
            realtimeAttempts < 4
        ) {

            handler.postDelayed(
                {
                    startRealtimeData()
                },
                3000
            )
        }
    }

    private fun sendFrame(
        opcode: Int,
        payload: ByteArray,
        completed: (() -> Unit)? = null
    ) {

        val command =
            getCommandCharacteristic()

        if (
            command == null
        ) {

            log(
                getString(
                    R.string.command_unavailable,
                    "%02X".format(opcode)
                )
            )

            return
        }

        val frame =
            buildFrame(
                opcode,
                payload
            )

        log(
            getString(
                R.string.tx_frame,
                "%02X".format(opcode),
                hex(payload)
            )
        )

        writeCommand(
            command,
            frame
        )

        handler.postDelayed(
            {
                completed?.invoke()
            },
            80
        )
    }

    private fun buildFrame(
        opcode: Int,
        payload: ByteArray
    ): ByteArray {

        val opcodeBytes =
            encodeVarint(
                opcode.toLong()
            )

        val result =
            ByteArray(
                3 +
                        opcodeBytes.size +
                        payload.size
            )

        result[0] = 0x01
        result[1] = 0x00
        result[2] = 0x08

        opcodeBytes.copyInto(
            result,
            3
        )

        payload.copyInto(
            result,
            3 + opcodeBytes.size
        )

        return result
    }

    private fun encodeVarint(
        value: Long
    ): ByteArray {

        var current = value

        val bytes =
            mutableListOf<Byte>()

        while (
            current >= 0x80L
        ) {

            bytes.add(
                (
                        (current and 0x7FL) or
                                0x80L
                        ).toByte()
            )

            current =
                current ushr 7
        }

        bytes.add(
            current.toByte()
        )

        return bytes.toByteArray()
    }

    private fun writeCommand(
        characteristic: BluetoothGattCharacteristic,
        data: ByteArray
    ) {

        val gatt =
            bluetoothGatt
                ?: return

        try {

            if (
                Build.VERSION.SDK_INT >= 33
            ) {

                gatt.writeCharacteristic(
                    characteristic,
                    data,
                    WRITE_TYPE
                )

            } else {

                @Suppress("DEPRECATION")
                characteristic.writeType =
                    WRITE_TYPE

                @Suppress("DEPRECATION")
                characteristic.value =
                    data

                @Suppress("DEPRECATION")
                gatt.writeCharacteristic(
                    characteristic
                )
            }

        } catch (
            exception: SecurityException
        ) {

            log(
                getString(
                    R.string.write_failed,
                    exception.message ?: ""
                )
            )
        }
    }

    private fun writeAck(
        characteristic: BluetoothGattCharacteristic,
        data: ByteArray
    ) {

        val gatt =
            bluetoothGatt
                ?: return

        try {

            if (
                Build.VERSION.SDK_INT >= 33
            ) {

                gatt.writeCharacteristic(
                    characteristic,
                    data,
                    BluetoothGattCharacteristic
                        .WRITE_TYPE_NO_RESPONSE
                )

            } else {

                @Suppress("DEPRECATION")
                characteristic.writeType =
                    BluetoothGattCharacteristic
                        .WRITE_TYPE_NO_RESPONSE

                @Suppress("DEPRECATION")
                characteristic.value =
                    data

                @Suppress("DEPRECATION")
                gatt.writeCharacteristic(
                    characteristic
                )
            }

        } catch (
            exception: SecurityException
        ) {

            log(
                "ACK WRITE FAILED: ${exception.message ?: ""}"
            )
        }
    }

    private fun getCommandCharacteristic():
            BluetoothGattCharacteristic? {

        val gatt =
            bluetoothGatt
                ?: return null

        return gatt.services
            .flatMap {
                it.characteristics
            }
            .firstOrNull {
                it.uuid ==
                        COMMAND_UUID
            }
    }

    private fun getNotificationCharacteristic():
            BluetoothGattCharacteristic? {

        val gatt =
            bluetoothGatt
                ?: return null

        return gatt.services
            .flatMap {
                it.characteristics
            }
            .firstOrNull {
                it.uuid ==
                        NOTIFICATION_UUID
            }
    }

    private fun logPacket(
        uuid: UUID,
        value: ByteArray
    ) {

        if (
            value.isEmpty()
        ) {
            return
        }

        val hexValue =
            hex(value)

        val decimalValue =
            value.joinToString(",") {
                (
                        it.toInt() and
                                0xFF
                        ).toString()
            }

        val asciiValue =
            value.joinToString("") {

                val byte =
                    it.toInt() and 0xFF

                if (
                    byte in 32..126
                ) {

                    byte.toChar()
                        .toString()

                } else {

                    "."
                }
            }

        Log.d(
            "VITALIS_BLE",
            "RX UUID=$uuid SIZE=${value.size} HEX=$hexValue"
        )

        Log.d(
            "VITALIS_BLE",
            "RX DECIMAL=$decimalValue"
        )

        Log.d(
            "VITALIS_BLE",
            "RX ASCII=$asciiValue"
        )

        log(
            "========== BLE RX =========="
        )

        log(
            "UUID: $uuid"
        )

        log(
            "SIZE: ${value.size} bytes"
        )

        log(
            "HEX: $hexValue"
        )

        log(
            "DECIMAL: $decimalValue"
        )

        log(
            "ASCII: $asciiValue"
        )

        log(
            "============================="
        )

        parseNoisePacket(
            value
        )
    }

    private fun parseNoisePacket(
        value: ByteArray
    ) {

        if (
            value.size < 4
        ) {
            return
        }

        val prefixMatches =
            (value[0].toInt() and 0xFF) == 0x01 &&
                    (value[1].toInt() and 0xFF) == 0x00 &&
                    (value[2].toInt() and 0xFF) == 0x08

        if (!prefixMatches) {
            return
        }

        val opcodeResult =
            readVarint(
                value,
                3
            )

        if (
            opcodeResult == null
        ) {
            return
        }

        val opcode =
            opcodeResult.first.toInt()

        val payloadStart =
            opcodeResult.second

        log(
            "NOISE OPCODE: %02X".format(
                opcode
            )
        )

        Log.d(
            "VITALIS_BLE",
            "NOISE OPCODE=%02X".format(
                opcode
            )
        )

        parseHealthProtobuf(
            value,
            payloadStart
        )

        when (opcode) {

            0x70 ->

                log(
                    getString(
                        R.string.fitness_metadata
                    )
                )

            0x71 ->

                log(
                    getString(
                        R.string.fitness_record
                    )
                )

            0x73 ->

                log(
                    getString(
                        R.string.fitness_ack
                    )
                )

            0x75 ->

                log(
                    getString(
                        R.string.fitness_complete
                    )
                )

            0xA4 ->

                log(
                    getString(
                        R.string.device_status
                    )
                )

            0xC3 ->

                log(
                    getString(
                        R.string.status_telemetry
                    )
                )

            else ->

                log(
                    getString(
                        R.string.unknown_opcode
                    )
                )
        }
    }

    private fun parseHealthProtobuf(
        data: ByteArray,
        startIndex: Int
    ) {

        if (
            startIndex >= data.size
        ) {
            return
        }

        parseProtobufRange(
            data,
            startIndex,
            data.size,
            0
        )
    }

    private fun parseProtobufRange(
        data: ByteArray,
        start: Int,
        end: Int,
        depth: Int
    ) {

        if (
            depth > 3 ||
            start >= end
        ) {
            return
        }

        var index = start

        while (
            index < end
        ) {

            val keyResult =
                readVarint(
                    data,
                    index,
                    end
                )

            if (
                keyResult == null
            ) {
                return
            }

            val key =
                keyResult.first

            index =
                keyResult.second

            val fieldNumber =
                key ushr 3

            val wireType =
                (key and 7L).toInt()

            if (fieldNumber !in 1..1000) {
                return
            }

            when (wireType) {

                0 -> {

                    val valueResult =
                        readVarint(
                            data,
                            index,
                            end
                        )

                    if (
                        valueResult == null
                    ) {
                        return
                    }

                    val value =
                        valueResult.first

                    index =
                        valueResult.second

                    processHealthField(
                        fieldNumber,
                        value
                    )
                }

                1 -> {

                    if (
                        index + 8 > end
                    ) {
                        return
                    }

                    index += 8
                }

                2 -> {

                    val lengthResult =
                        readVarint(
                            data,
                            index,
                            end
                        )

                    if (
                        lengthResult == null
                    ) {
                        return
                    }

                    val lengthLong =
                        lengthResult.first

                    if (
                        lengthLong !in
                        0L..Int.MAX_VALUE.toLong()
                    ) {
                        return
                    }

                    val length =
                        lengthLong.toInt()

                    index =
                        lengthResult.second

                    if (
                        index + length > end
                    ) {
                        return
                    }

                    if (
                        length > 0
                    ) {

                        parseProtobufRange(
                            data,
                            index,
                            index + length,
                            depth + 1
                        )
                    }

                    index += length
                }

                5 -> {

                    if (
                        index + 4 > end
                    ) {
                        return
                    }

                    index += 4
                }

                else -> {

                    return
                }
            }
        }
    }

    private fun processHealthField(
        fieldNumber: Long,
        value: Long
    ) {

        when (fieldNumber) {

            1L -> {

                if (
                    value in 0L..100000L
                ) {

                    updateStepsFromBle(
                        value.toInt()
                    )
                }
            }

            2L -> {

                if (
                    value in 0L..10000L
                ) {

                    updateCaloriesFromBle(
                        value.toInt()
                    )
                }
            }

            3L -> {

                if (
                    value in 0L..1000000L
                ) {

                    updateDistanceFromBle(
                        value
                    )
                }
            }

            4L -> {

                if (
                    value in 30L..220L
                ) {

                    updateHeartRateFromBle(
                        value.toInt()
                    )
                }
            }

            5L -> {

                if (
                    value in 70L..100L
                ) {

                    updateSpo2FromBle(
                        value.toInt()
                    )
                }
            }

            12L -> {

                if (
                    value in 0L..3000L
                ) {

                    updatePressureFromBle(
                        value.toInt()
                    )
                }
            }
        }
    }

    private fun readVarint(
        data: ByteArray,
        start: Int,
        end: Int = data.size
    ): Pair<Long, Int>? {

        var result = 0L
        var shift = 0

        var index = start

        while (
            index < end &&
            shift < 64
        ) {

            val current =
                data[index].toInt() and 0xFF

            result =
                result or
                        (
                                (current and 0x7F)
                                    .toLong() shl shift
                                )

            index++

            if (
                (current and 0x80) == 0
            ) {

                return Pair(
                    result,
                    index
                )
            }

            shift += 7
        }

        return null
    }

    private fun updateHeartRateFromBle(
        value: Int
    ) {

        if (simulatorMode) return

        heartRateLive = true

        runOnUiThread {
            heartRateText.text =
                "Heart Rate: $value BPM"
        }

        markLiveDataReceived(
            "Heart Rate",
            value.toString()
        )
    }

    private fun updateSpo2FromBle(
        value: Int
    ) {

        if (simulatorMode) return

        spo2Live = true

        runOnUiThread {
            spo2Text.text =
                "SpO₂: $value%"
        }

        markLiveDataReceived(
            "SpO₂",
            value.toString()
        )
    }

    private fun updateStepsFromBle(
        value: Int
    ) {

        stepsLive = true

        runOnUiThread {
            stepsText.text =
                "Steps: $value"
        }

        markLiveDataReceived(
            "Steps",
            value.toString()
        )
    }

    private fun updateCaloriesFromBle(
        value: Int
    ) {

        caloriesLive = true

        runOnUiThread {
            caloriesText.text =
                "Calories: $value kcal"
        }

        markLiveDataReceived(
            "Calories",
            value.toString()
        )
    }

    private fun updateDistanceFromBle(
        value: Long
    ) {

        distanceLive = true

        runOnUiThread {
            distanceText.text =
                "Distance: $value"
        }

        markLiveDataReceived(
            "Distance",
            value.toString()
        )
    }

    private fun updatePressureFromBle(
        value: Int
    ) {

        if (simulatorMode) return

        pressureLive = true

        runOnUiThread {
            pressureText.text =
                "Pressure: $value"
        }

        markLiveDataReceived(
            "Pressure",
            value.toString()
        )
    }

    private fun markLiveDataReceived(
        metric: String,
        value: String
    ) {

        log(
            "LIVE BLE DATA: $metric = $value"
        )

        updateDataSourceLabel()
    }

    private fun updateDataSourceLabel() {

        val liveMetrics =
            mutableListOf<String>()

        if (heartRateLive) liveMetrics.add("HR")
        if (spo2Live) liveMetrics.add("SpO₂")
        if (stepsLive) liveMetrics.add("STEPS")
        if (caloriesLive) liveMetrics.add("CALORIES")
        if (distanceLive) liveMetrics.add("DISTANCE")
        if (pressureLive) liveMetrics.add("PRESSURE")

        when {
            liveMetrics.size == 6 -> {
                dataSourceText.text =
                    "DATA SOURCE: LIVE • BLE"
            }

            liveMetrics.isNotEmpty() -> {
                dataSourceText.text =
                    "DATA SOURCE: LIVE BLE • RECEIVED: ${liveMetrics.joinToString(", ")}"
            }

            else -> {
                dataSourceText.text =
                    "DATA SOURCE: LIVE BLE • WAITING FOR HEALTH DATA"
            }
        }
    }

    private fun resetLiveDataState() {

        heartRateLive = false
        spo2Live = false
        stepsLive = false
        caloriesLive = false
        distanceLive = false
        pressureLive = false

    }

    private fun hex(
        data: ByteArray
    ): String {

        return data.joinToString(" ") {

            "%02X".format(
                it.toInt() and 0xFF
            )
        }
    }

    private fun retryConnection() {

        if (
            scanAttempt >= 3
        ) {

            log(
                getString(
                    R.string.connection_attempts_finished
                )
            )

            return
        }

        scanAttempt++

        log(
            getString(
                R.string.retrying_connection
            )
        )

        handler.postDelayed(
            {
                startWatchScan()
            },
            1500
        )
    }

    private fun log(
        message: String
    ) {

        runOnUiThread {

            if (
                !::logText.isInitialized
            ) {
                return@runOnUiThread
            }

            logText.append(
                message
            )

            logText.append(
                "\n"
            )

            logText.post {

                if (
                    ::logScroll.isInitialized
                ) {

                    logScroll.fullScroll(
                        ScrollView.FOCUS_DOWN
                    )
                }
            }
        }
    }

    override fun onDestroy() {

        handler.removeCallbacksAndMessages(
            null
        )

        stopWatchScan()

        bluetoothGatt?.disconnect()

        bluetoothGatt?.close()

        bluetoothGatt = null

        textToSpeech.stop()

        textToSpeech.shutdown()

        super.onDestroy()
    }
}
