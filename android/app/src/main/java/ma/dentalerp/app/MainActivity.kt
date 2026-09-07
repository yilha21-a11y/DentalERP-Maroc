package ma.dentalerp.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    DentalERPTabletApp()
                }
            }
        }
    }
}

enum class TabletTab(val label: String) {
    AGENDA("Agenda"),
    MESSAGES("Messages"),
    STATS("Statistiques")
}

@Composable
fun DentalERPTabletApp() {
    var user by remember { mutableStateOf<MobileUser?>(null) }
    if (user == null) {
        LoginScreen(onLoggedIn = { user = it })
    } else {
        TabletHome(user = user!!, onLogout = {
            ApiClient.tokenStore.token = null
            user = null
        })
    }
}

@Composable
fun LoginScreen(onLoggedIn: (MobileUser) -> Unit) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Card(modifier = Modifier.widthIn(max = 520.dp).padding(24.dp)) {
            Column(modifier = Modifier.padding(28.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("DentalERP Maroc", style = MaterialTheme.typography.headlineMedium)
                Text("Connexion au cabinet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("E-mail") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Mot de passe") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth(), singleLine = true)
                if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error)
                Button(
                    onClick = {
                        scope.launch {
                            loading = true
                            error = ""
                            try {
                                val result = ApiClient.api.login(MobileLoginRequest(email.trim(), password))
                                ApiClient.tokenStore.token = result.token
                                onLoggedIn(result.user)
                            } catch (_: Exception) {
                                error = "Connexion impossible. Vérifiez vos identifiants et le serveur."
                            } finally {
                                loading = false
                            }
                        }
                    },
                    enabled = !loading && email.isNotBlank() && password.length >= 6,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (loading) CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text("Se connecter")
                }
            }
        }
    }
}

@Composable
fun TabletHome(user: MobileUser, onLogout: () -> Unit) {
    var tab by remember { mutableStateOf(TabletTab.AGENDA) }
    val allowedTabs = remember(user.role) {
        buildList {
            add(TabletTab.AGENDA)
            add(TabletTab.MESSAGES)
            if (user.role == "DOCTOR" || user.role == "ADMIN" || user.role == "ACCOUNTANT") add(TabletTab.STATS)
        }
    }

    Scaffold(
        topBar = {
            Surface(tonalElevation = 2.dp) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("DentalERP Maroc", style = MaterialTheme.typography.titleLarge)
                        Text("${user.name ?: user.email} • ${roleLabel(user.role)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    OutlinedButton(onClick = onLogout) { Text("Déconnexion") }
                }
            }
        },
        bottomBar = {
            NavigationBar {
                allowedTabs.forEach { item ->
                    NavigationBarItem(
                        selected = tab == item,
                        onClick = { tab = item },
                        icon = { Text(if (item == TabletTab.AGENDA) "A" else if (item == TabletTab.MESSAGES) "M" else "S") },
                        label = { Text(item.label) }
                    )
                }
            }
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (tab) {
                TabletTab.AGENDA -> TodayScreen()
                TabletTab.MESSAGES -> MessagesScreen()
                TabletTab.STATS -> DoctorStatsScreen()
            }
        }
    }
}

@Composable
fun TodayScreen() {
    val scope = rememberCoroutineScope()
    var appointments by remember { mutableStateOf<List<TodayAppointment>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }

    fun reload() {
        scope.launch {
            loading = true
            error = ""
            try {
                val response = ApiClient.api.todayAppointments()
                appointments = response.queue.waiting + response.queue.inProgress + response.queue.upcoming + response.queue.completed
            } catch (_: Exception) {
                error = "Impossible de charger l’agenda."
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Agenda du jour", style = MaterialTheme.typography.headlineMedium)
            OutlinedButton(onClick = { reload() }) { Text("Actualiser") }
        }
        Spacer(Modifier.height(20.dp))

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            error.isNotBlank() -> Text(error, color = MaterialTheme.colorScheme.error)
            appointments.isEmpty() -> Text("Aucun rendez-vous aujourd’hui.")
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(appointments, key = { it.id }) { appt ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.fillMaxWidth().padding(18.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text("${appt.patient.firstName} ${appt.patient.lastName}", style = MaterialTheme.typography.titleMedium)
                                Text("${appt.scheduledTime} • ${appt.appointmentType ?: "Consultation"}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            AssistChip(onClick = {}, label = { Text(statusLabel(appt.status)) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MessagesScreen() {
    var rows by remember { mutableStateOf<List<ConversationSummary>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        try {
            rows = ApiClient.api.conversations().data
        } catch (_: Exception) {
            error = "Impossible de charger les messages."
        } finally {
            loading = false
        }
    }

    Column(Modifier.fillMaxSize().padding(24.dp)) {
        Text("Messages internes", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(16.dp))
        when {
            loading -> CircularProgressIndicator()
            error.isNotBlank() -> Text(error, color = MaterialTheme.colorScheme.error)
            rows.isEmpty() -> Text("Aucune conversation.")
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(rows, key = { it.id }) { row ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(row.name ?: row.memberNames ?: "Conversation", style = MaterialTheme.typography.titleMedium)
                                if (row.unreadCount > 0) Badge { Text(row.unreadCount.toString()) }
                            }
                            if (!row.lastMessage.isNullOrBlank()) Text(row.lastMessage, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DoctorStatsScreen() {
    var rows by remember { mutableStateOf<List<DoctorMetric>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    val month = remember { LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM")) }

    LaunchedEffect(Unit) {
        try {
            rows = ApiClient.api.doctorReports(month).data
        } catch (_: Exception) {
            error = "Impossible de charger les statistiques."
        } finally {
            loading = false
        }
    }

    Column(Modifier.fillMaxSize().padding(24.dp)) {
        Text("Statistiques mensuelles", style = MaterialTheme.typography.headlineMedium)
        Text(month, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(16.dp))
        when {
            loading -> CircularProgressIndicator()
            error.isNotBlank() -> Text(error, color = MaterialTheme.colorScheme.error)
            rows.isEmpty() -> Text("Aucune donnée pour ce mois.")
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(rows, key = { it.doctorId }) { row ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("Dr ${row.doctorName}", style = MaterialTheme.typography.titleMedium)
                            Text("Patients vus : ${row.patientsSeen.toInt()}")
                            Text("Généré : ${moneyMad(row.generatedRevenue)}")
                            Text("Encaissé : ${moneyMad(row.collectedRevenue)}")
                            Text("Reste : ${moneyMad(row.outstanding)}")
                            Text("No-show : ${row.noShowRate} %")
                        }
                    }
                }
            }
        }
    }
}

private fun moneyMad(value: Double): String = String.format("%.2f MAD", value)

private fun roleLabel(role: String): String = when (role) {
    "DOCTOR" -> "Dentiste"
    "ASSISTANT" -> "Assistant(e)"
    "RECEPTIONIST" -> "Réception"
    "ACCOUNTANT" -> "Comptable"
    "LAB_TECH" -> "Laboratoire"
    "ADMIN" -> "Administrateur"
    else -> role
}

private fun statusLabel(status: String): String = when (status) {
    "SCHEDULED" -> "Planifié"
    "CONFIRMED" -> "Confirmé"
    "CHECKED_IN" -> "Arrivé"
    "IN_PROGRESS" -> "En consultation"
    "COMPLETED" -> "Terminé"
    "NO_SHOW" -> "Absent"
    "CANCELLED" -> "Annulé"
    else -> status
}
