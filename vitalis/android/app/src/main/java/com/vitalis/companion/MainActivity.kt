package com.vitalis.companion

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.ActivityResultLauncher
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var healthConnectClient: HealthConnectClient
    private lateinit var permissionLauncher: ActivityResultLauncher<Set<String>>
    private lateinit var healthConnectReader: HealthConnectReader

    private val healthConnectPermissions = setOf(
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(OxygenSaturationRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class)
    )

    private var healthConnectAvailable = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        Log.d("VITALIS_HEALTH", "VITALIS NEW BUILD STARTED")

        val sdkStatus = HealthConnectClient.getSdkStatus(
            this,
            "com.google.android.apps.healthdata"
        )

        Log.d(
            "VITALIS_HEALTH",
            "Health Connect SDK status: $sdkStatus"
        )

        healthConnectAvailable =
            sdkStatus == HealthConnectClient.SDK_AVAILABLE

        if (healthConnectAvailable) {
            healthConnectClient =
                HealthConnectClient.getOrCreate(this)

            healthConnectReader =
                HealthConnectReader(this)
        }

        permissionLauncher =
            registerForActivityResult(
                PermissionController.createRequestPermissionResultContract()
            ) {
                Log.d(
                    "VITALIS_HEALTH",
                    "Permission request completed"
                )

                checkPermissions()
            }

        setContent {
            var permissionsGranted by remember {
                mutableStateOf(false)
            }

            var heartRate by remember {
                mutableStateOf("--")
            }

            var spo2 by remember {
                mutableStateOf("--")
            }

            var steps by remember {
                mutableStateOf("--")
            }

            var status by remember {
                mutableStateOf(
                    if (healthConnectAvailable)
                        "Health Connect available"
                    else
                        "Health Connect unavailable"
                )
            }

            LaunchedEffect(healthConnectAvailable) {
                if (healthConnectAvailable) {
                    permissionsGranted =
                        getPermissionsGranted()

                    if (permissionsGranted) {
                        status = "Health Connect connected"
                    }
                }
            }

            VitalisScreen(
                healthConnectAvailable = healthConnectAvailable,
                permissionsGranted = permissionsGranted,
                status = status,
                heartRate = heartRate,
                spo2 = spo2,
                steps = steps,

                onConnect = {
                    requestHealthPermissions()
                },

                onReadData = {
                    lifecycleScope.launch {
                        try {
                            status = "Reading health data..."

                            Log.d(
                                "VITALIS_DATA",
                                "Reading Health Connect data..."
                            )

                            val data =
                                healthConnectReader
                                    .readLatestHealthData()

                            heartRate =
                                data.heartRate
                                    ?.toString()
                                    ?: "--"

                            spo2 =
                                data.spo2
                                    ?.toString()
                                    ?: "--"

                            steps =
                                data.steps
                                    ?.toString()
                                    ?: "--"

                            status =
                                "Health data read successfully"

                            Log.d(
                                "VITALIS_DATA",
                                "Heart Rate: ${data.heartRate}"
                            )

                            Log.d(
                                "VITALIS_DATA",
                                "SpO2: ${data.spo2}"
                            )

                            Log.d(
                                "VITALIS_DATA",
                                "Steps: ${data.steps}"
                            )

                        } catch (error: Exception) {

                            status = "Failed to read health data"

                            Log.e(
                                "VITALIS_DATA",
                                "Failed to read health data",
                                error
                            )
                        }
                    }
                }
            )
        }
    }

    private fun requestHealthPermissions() {

        if (!healthConnectAvailable) {
            Log.e(
                "VITALIS_HEALTH",
                "Health Connect unavailable"
            )
            return
        }

        lifecycleScope.launch {

            val granted =
                getPermissionsGranted()

            if (granted) {

                Log.d(
                    "VITALIS_HEALTH",
                    "All permissions already granted"
                )

                return@launch
            }

            Log.d(
                "VITALIS_HEALTH",
                "Launching Health Connect permission request"
            )

            permissionLauncher.launch(
                healthConnectPermissions
            )
        }
    }

    private suspend fun getPermissionsGranted(): Boolean {

        return try {

            val granted =
                healthConnectClient
                    .permissionController
                    .getGrantedPermissions()

            Log.d(
                "VITALIS_HEALTH",
                "Currently granted permissions: $granted"
            )

            healthConnectPermissions
                .all { it in granted }

        } catch (error: Exception) {

            Log.e(
                "VITALIS_HEALTH",
                "Permission check failed",
                error
            )

            false
        }
    }

    private fun checkPermissions() {

        if (!healthConnectAvailable) return

        lifecycleScope.launch {

            val granted =
                getPermissionsGranted()

            Log.d(
                "VITALIS_HEALTH",
                "All required permissions granted: $granted"
            )
        }
    }
}

@Composable
fun VitalisScreen(
    healthConnectAvailable: Boolean,
    permissionsGranted: Boolean,
    status: String,
    heartRate: String,
    spo2: String,
    steps: String,
    onConnect: () -> Unit,
    onReadData: () -> Unit
) {

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),

        horizontalAlignment = Alignment.CenterHorizontally,

        verticalArrangement = Arrangement.Center
    ) {

        Text(
            text = "VITALIS",
            style = MaterialTheme.typography.headlineLarge
        )

        Spacer(
            modifier = Modifier.height(12.dp)
        )

        Text(
            text = status
        )

        Spacer(
            modifier = Modifier.height(24.dp)
        )

        Button(
            onClick = onConnect,
            enabled = healthConnectAvailable &&
                    !permissionsGranted
        ) {
            Text(
                text = if (permissionsGranted)
                    "Health Data Connected"
                else
                    "Connect Health Data"
            )
        }

        Spacer(
            modifier = Modifier.height(16.dp)
        )

        Button(
            onClick = onReadData,
            enabled = healthConnectAvailable &&
                    permissionsGranted
        ) {
            Text(
                text = "Read Health Data"
            )
        }

        Spacer(
            modifier = Modifier.height(32.dp)
        )

        Text(
            text = "Heart Rate: $heartRate BPM"
        )

        Spacer(
            modifier = Modifier.height(12.dp)
        )

        Text(
            text = "SpO₂: $spo2 %"
        )

        Spacer(
            modifier = Modifier.height(12.dp)
        )

        Text(
            text = "Steps: $steps"
        )
    }
}