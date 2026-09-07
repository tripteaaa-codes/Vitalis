package com.vitalis.companion

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class MainActivity : ComponentActivity() {

    companion object {

        private const val WATCH_NAME = "NF_2_8FE9"
        private const val WATCH_ADDRESS = "04:CA:8F:3C:8F:E9"

        private val NOISE_SERVICE_UUID =
            UUID.fromString(
                "16186f00-0000-1000-8000-00807f9b34fb"
            )

        private val NOTIFICATION_CHARACTERISTIC_UUID =
            UUID.fromString(
                "16186f01-0000-1000-8000-00807f9b34fb"
            )

        private val COMMAND_CHARACTERISTIC_UUID =
            UUID.fromString(
                "16186f02-0000-1000-8000-00807f9b34fb"
            )

        private val NOTIFICATION_DESCRIPTOR_UUID =
            UUID.fromString(
                "00002902-0000-1000-8000-00805f9b34fb"
            )
    }

    private lateinit var logView: TextView

    private var bluetoothGatt: BluetoothGatt? = null

    private var notificationCharacteristic:
            BluetoothGattCharacteristic? = null

    private var commandCharacteristic:
            BluetoothGattCharacteristic? = null

    private val permissionLauncher =
        registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { permissions ->

            val granted =
                permissions[
                    Manifest.permission.BLUETOOTH_SCAN
                ] == true &&
                        permissions[
                            Manifest.permission.BLUETOOTH_CONNECT
                        ] == true

            if (granted) {

                log(
                    getString(
                        R.string.bluetooth_permission_granted
                    )
                )

                findPairedWatch()

            } else {

                log(
                    getString(
                        R.string.bluetooth_permission_required
                    )
                )
            }
        }

    private val gattCallback =
        object : BluetoothGattCallback() {

            @SuppressLint("MissingPermission")
            override fun onConnectionStateChange(
                gatt: BluetoothGatt,
                status: Int,
                newState: Int
            ) {

                runOnUiThread {

                    when (newState) {

                        android.bluetooth.BluetoothProfile.STATE_CONNECTED -> {

                            log(
                                getString(
                                    R.string.watch_connected,
                                    status
                                )
                            )

                            if (hasBluetoothPermission()) {

                                log(
                                    getString(
                                        R.string.discovering_services
                                    )
                                )

                                gatt.discoverServices()
                            }
                        }

                        android.bluetooth.BluetoothProfile.STATE_DISCONNECTED -> {

                            log(
                                getString(
                                    R.string.watch_disconnected,
                                    status
                                )
                            )

                            notificationCharacteristic = null
                            commandCharacteristic = null
                        }
                    }
                }
            }

            override fun onServicesDiscovered(
                gatt: BluetoothGatt,
                status: Int
            ) {

                runOnUiThread {

                    if (status != BluetoothGatt.GATT_SUCCESS) {

                        log(
                            getString(
                                R.string.discovery_failed,
                                status
                            )
                        )

                        return@runOnUiThread
                    }

                    log(
                        getString(
                            R.string.services_discovered
                        )
                    )

                    var noiseServiceFound = false

                    for (service in gatt.services) {

                        log(
                            getString(
                                R.string.service_found,
                                service.uuid.toString()
                            )
                        )

                        for (
                        characteristic
                        in service.characteristics
                        ) {

                            log(
                                getString(
                                    R.string.characteristic_found,
                                    characteristic.uuid.toString()
                                )
                            )

                            log(
                                getString(
                                    R.string.characteristic_properties,
                                    getProperties(
                                        characteristic.properties
                                    )
                                )
                            )

                            if (
                                service.uuid ==
                                NOISE_SERVICE_UUID
                            ) {

                                noiseServiceFound = true

                                when (characteristic.uuid) {

                                    NOTIFICATION_CHARACTERISTIC_UUID -> {

                                        notificationCharacteristic =
                                            characteristic

                                        log(
                                            getString(
                                                R.string.notification_characteristic_found
                                            )
                                        )
                                    }

                                    COMMAND_CHARACTERISTIC_UUID -> {

                                        commandCharacteristic =
                                            characteristic

                                        log(
                                            getString(
                                                R.string.command_characteristic_found
                                            )
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (noiseServiceFound) {

                        log(
                            getString(
                                R.string.protocol_found
                            )
                        )

                        enableNotifications()

                    } else {

                        log(
                            getString(
                                R.string.protocol_not_found
                            )
                        )
                    }
                }
            }

            @Deprecated("Deprecated BluetoothGatt callback")
            @Suppress("DEPRECATION")
            override fun onCharacteristicChanged(
                gatt: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic
            ) {
                val data = characteristic.value
                processIncomingPacket(data)
            }

            override fun onCharacteristicWrite(
                gatt: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic,
                status: Int
            ) {

                runOnUiThread {

                    log(
                        getString(
                            R.string.write_status,
                            status
                        )
                    )
                }
            }

            override fun onDescriptorWrite(
                gatt: BluetoothGatt,
                descriptor: BluetoothGattDescriptor,
                status: Int
            ) {

                runOnUiThread {

                    log(
                        getString(
                            R.string.notification_write_status,
                            status
                        )
                    )
                }
            }
        }

    override fun onCreate(
        savedInstanceState: Bundle?
    ) {

        super.onCreate(savedInstanceState)

        buildInterface()

        requestBluetoothPermission()
    }

    private fun buildInterface() {

        val root =
            LinearLayout(this).apply {

                orientation =
                    LinearLayout.VERTICAL

                setPadding(
                    32,
                    32,
                    32,
                    32
                )
            }

        val title =
            TextView(this).apply {

                text =
                    getString(
                        R.string.app_title
                    )

                textSize = 24f
            }

        val watchInfo =
            TextView(this).apply {

                text =
                    getString(
                        R.string.watch_information,
                        WATCH_ADDRESS
                    )

                textSize = 16f
            }

        val connectButton =
            Button(this).apply {

                text =
                    getString(
                        R.string.connect_watch
                    )

                setOnClickListener {
                    findPairedWatch()
                }
            }

        val testButton =
            Button(this).apply {

                text =
                    getString(
                        R.string.test_watch
                    )

                setOnClickListener {
                    testProtocol()
                }
            }

        val clearButton =
            Button(this).apply {

                text =
                    getString(
                        R.string.clear_log
                    )

                setOnClickListener {
                    logView.text = ""
                }
            }

        logView =
            TextView(this).apply {

                textSize = 14f
            }

        val scrollView =
            ScrollView(this).apply {

                addView(logView)

                layoutParams =
                    LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        0,
                        1f
                    )
            }

        root.addView(title)
        root.addView(watchInfo)
        root.addView(connectButton)
        root.addView(testButton)
        root.addView(clearButton)
        root.addView(scrollView)

        setContentView(root)
    }

    private fun requestBluetoothPermission() {

        if (hasBluetoothPermission()) {

            log(
                getString(
                    R.string.bluetooth_permission_granted
                )
            )

            findPairedWatch()

        } else {

            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.BLUETOOTH_SCAN,
                    Manifest.permission.BLUETOOTH_CONNECT
                )
            )
        }
    }

    private fun hasBluetoothPermission(): Boolean {

        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.BLUETOOTH_SCAN
        ) == PackageManager.PERMISSION_GRANTED &&
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.BLUETOOTH_CONNECT
                ) == PackageManager.PERMISSION_GRANTED
    }

    @SuppressLint("MissingPermission")
    private fun findPairedWatch() {

        if (!hasBluetoothPermission()) {

            log(
                getString(
                    R.string.bluetooth_permission_required
                )
            )

            return
        }

        try {

            val bluetoothManager =
                getSystemService(
                    BluetoothManager::class.java
                )

            val adapter =
                bluetoothManager.adapter

            if (!adapter.isEnabled) {

                log(
                    getString(
                        R.string.bluetooth_disabled
                    )
                )

                return
            }

            val devices =
                adapter.bondedDevices

            val watch =
                devices.firstOrNull {

                    it.address.equals(
                        WATCH_ADDRESS,
                        ignoreCase = true
                    )

                } ?: devices.firstOrNull {

                    it.name == WATCH_NAME
                }

            if (watch == null) {

                log(
                    getString(
                        R.string.watch_not_paired
                    )
                )

                return
            }

            log(
                getString(
                    R.string.watch_found,
                    watch.name ?: WATCH_NAME
                )
            )

            log(
                getString(
                    R.string.watch_address,
                    watch.address
                )
            )

            connectUsingGatt(watch)

        } catch (_: SecurityException) {

            log(
                getString(
                    R.string.bluetooth_permission_required
                )
            )

        } catch (error: Exception) {

            log(
                getString(
                    R.string.bluetooth_error,
                    error.message
                        ?: getString(
                            R.string.unknown_error
                        )
                )
            )
        }
    }

    @SuppressLint("MissingPermission")
    @Suppress("DEPRECATION")
    private fun connectUsingGatt(
        device: BluetoothDevice
    ) {

        try {

            bluetoothGatt?.close()

            bluetoothGatt = null

            log(
                getString(
                    R.string.connecting
                )
            )

            bluetoothGatt =
                device.connectGatt(
                    this,
                    false,
                    gattCallback
                )

            log(
                getString(
                    R.string.gatt_requested
                )
            )

        } catch (_: SecurityException) {

            log(
                getString(
                    R.string.bluetooth_permission_required
                )
            )
        }
    }

    @SuppressLint("MissingPermission")
    private fun enableNotifications() {

        if (!hasBluetoothPermission()) {
            return
        }

        val gatt =
            bluetoothGatt
                ?: return

        val characteristic =
            notificationCharacteristic
                ?: run {

                    log(
                        getString(
                            R.string.notification_characteristic_missing
                        )
                    )

                    return
                }

        try {

            val subscribed =
                gatt.setCharacteristicNotification(
                    characteristic,
                    true
                )

            log(
                getString(
                    R.string.notifications_enabled,
                    subscribed
                )
            )

            val descriptor =
                characteristic.getDescriptor(
                    NOTIFICATION_DESCRIPTOR_UUID
                )

            if (descriptor == null) {

                log(
                    getString(
                        R.string.notification_descriptor_missing
                    )
                )

                return
            }

            val descriptorValue =
                BluetoothGattDescriptor
                    .ENABLE_NOTIFICATION_VALUE

            if (Build.VERSION.SDK_INT >= 33) {

                val result =
                    gatt.writeDescriptor(
                        descriptor,
                        descriptorValue
                    )

                log(
                    getString(
                        R.string.notification_subscription,
                        result ==
                                BluetoothGatt.GATT_SUCCESS
                    )
                )

            } else {

                @Suppress("DEPRECATION")
                descriptor.value =
                    descriptorValue

                @Suppress("DEPRECATION")
                val requested =
                    gatt.writeDescriptor(
                        descriptor
                    )

                log(
                    getString(
                        R.string.notification_subscription,
                        requested
                    )
                )
            }

        } catch (_: SecurityException) {

            log(
                getString(
                    R.string.bluetooth_permission_required
                )
            )
        }
    }

    private fun testProtocol() {

        val command =
            commandCharacteristic

        val notification =
            notificationCharacteristic

        if (
            command == null ||
            notification == null
        ) {

            log(
                getString(
                    R.string.watch_not_ready
                )
            )

            return
        }

        log(
            getString(
                R.string.protocol_test_started
            )
        )

        sendPacket(
            "PING",
            hexToBytes(
                "00 00 00 00 01 00"
            ),
            command
        )

        window.decorView.postDelayed({

            sendPacket(
                "ACK_OK",
                hexToBytes(
                    "00 00 01 01 00 00"
                ),
                notification
            )

        }, 400)

        window.decorView.postDelayed({

            log(
                getString(
                    R.string.protocol_test_finished
                )
            )

        }, 800)
    }

    @SuppressLint("MissingPermission")
    private fun sendPacket(
        name: String,
        packet: ByteArray,
        characteristic: BluetoothGattCharacteristic
    ) {

        val gatt =
            bluetoothGatt
                ?: return

        if (!hasBluetoothPermission()) {
            return
        }

        try {

            log(
                getString(
                    R.string.packet_sending,
                    name,
                    bytesToHex(packet)
                )
            )

            if (Build.VERSION.SDK_INT >= 33) {

                val result =
                    gatt.writeCharacteristic(
                        characteristic,
                        packet,
                        BluetoothGattCharacteristic
                            .WRITE_TYPE_DEFAULT
                    )

                log(
                    getString(
                        R.string.write_status,
                        result
                    )
                )

            } else {

                @Suppress("DEPRECATION")
                characteristic.value =
                    packet

                @Suppress("DEPRECATION")
                val requested =
                    gatt.writeCharacteristic(
                        characteristic
                    )

                log(
                    getString(
                        R.string.write_requested,
                        requested
                    )
                )
            }

        } catch (_: SecurityException) {

            log(
                getString(
                    R.string.bluetooth_permission_required
                )
            )
        }
    }

    private fun processIncomingPacket(
        data: ByteArray
    ) {

        val hex =
            bytesToHex(data)

        runOnUiThread {

            log(
                getString(
                    R.string.packet_received,
                    hex
                )
            )

            savePacket(hex)
        }
    }

    private fun savePacket(
        packet: String
    ) {

        try {

            val directory =
                getExternalFilesDir(null)

            if (directory == null) {

                log(
                    getString(
                        R.string.packet_directory_error
                    )
                )

                return
            }

            val file =
                File(
                    directory,
                    "vitalis_packets.txt"
                )

            val timestamp =
                SimpleDateFormat(
                    "yyyy-MM-dd HH:mm:ss.SSS",
                    Locale.US
                ).format(Date())

            file.appendText(
                "$timestamp  $packet\n"
            )

            log(
                getString(
                    R.string.packet_saved
                )
            )

        } catch (error: Exception) {

            log(
                getString(
                    R.string.packet_save_error,
                    error.message
                        ?: getString(
                            R.string.unknown_error
                        )
                )
            )
        }
    }

    private fun getProperties(
        properties: Int
    ): String {

        val names =
            mutableListOf<String>()

        if (
            properties and
            BluetoothGattCharacteristic
                .PROPERTY_READ != 0
        ) {
            names.add("READ")
        }

        if (
            properties and
            BluetoothGattCharacteristic
                .PROPERTY_WRITE != 0
        ) {
            names.add("WRITE")
        }

        if (
            properties and
            BluetoothGattCharacteristic
                .PROPERTY_WRITE_NO_RESPONSE != 0
        ) {
            names.add("WRITE_NO_RESPONSE")
        }

        if (
            properties and
            BluetoothGattCharacteristic
                .PROPERTY_NOTIFY != 0
        ) {
            names.add("NOTIFY")
        }

        if (
            properties and
            BluetoothGattCharacteristic
                .PROPERTY_INDICATE != 0
        ) {
            names.add("INDICATE")
        }

        return if (names.isEmpty()) {

            getString(
                R.string.unknown_properties
            )

        } else {

            names.joinToString(", ")
        }
    }

    private fun hexToBytes(
        input: String
    ): ByteArray {

        return input
            .trim()
            .split(Regex("\\s+"))
            .filter { it.isNotEmpty() }
            .map {
                it.toInt(16).toByte()
            }
            .toByteArray()
    }

    private fun bytesToHex(
        bytes: ByteArray
    ): String {

        return bytes.joinToString(" ") {
            "%02X".format(
                it.toInt() and 0xFF
            )
        }
    }

    private fun log(
        message: String
    ) {

        runOnUiThread {

            val timestamp =
                SimpleDateFormat(
                    "HH:mm:ss",
                    Locale.US
                ).format(Date())

            logView.append(
                "[$timestamp] $message\n"
            )
        }
    }

    override fun onDestroy() {

        try {

            bluetoothGatt?.disconnect()
            bluetoothGatt?.close()

        } catch (_: SecurityException) {
            // Bluetooth permission may have been revoked.
        }

        bluetoothGatt = null

        super.onDestroy()
    }
}