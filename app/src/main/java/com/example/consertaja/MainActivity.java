package com.example.consertaja;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.FirebaseException;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;
import com.google.firebase.auth.PhoneAuthCredential;
import com.google.firebase.auth.PhoneAuthOptions;
import com.google.firebase.auth.PhoneAuthProvider;
import com.google.firebase.FirebaseApp;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;

import com.google.gson.Gson;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.concurrent.TimeUnit;



public class MainActivity extends AppCompatActivity {

    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1001;
    private static final int AUDIO_PERMISSION_REQUEST_CODE = 1002;
    private static final int GALLERY_PERMISSION_REQUEST_CODE = 1003;
    private static final String PREFS_NAME = "ConsertaJaPrefs";
    private static final String KEY_PERMISSIONS_GRANTED = "permissions_granted";
    private static final String KEY_PERMISSIONS_SKIPPED = "permissions_skipped";

    private WebView webView;
    private FirebaseAuth auth;
    private GoogleSignInClient googleSignInClient;
    private DatabaseReference usersRef;
    private Gson gson = new Gson();
    private String verificationId;
    private boolean isForCreation = false; // Flag para indicar se é criação ou login
    private SharedPreferences sharedPreferences;





    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Inicializar SharedPreferences
        sharedPreferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);

        // Inicializar Firebase
        FirebaseApp.initializeApp(this);

        webView = findViewById(R.id.webView);
        auth = FirebaseAuth.getInstance();
        usersRef = FirebaseDatabase.getInstance().getReference("users");

        // Configura WebView
        WebSettings ws = webView.getSettings();

        // Configurações ESSENCIAIS para eventos JavaScript funcionarem
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true); // Permite armazenamento DOM
        ws.setAllowFileAccess(true); // Permite acesso a arquivos
        ws.setAllowContentAccess(true); // Permite acesso ao conteúdo
        ws.setAllowFileAccessFromFileURLs(true); // Permite JS em URLs file://
        ws.setAllowUniversalAccessFromFileURLs(true); // Acesso universal

        // Configurações de navegação e interações
        ws.setUseWideViewPort(false);
        ws.setLoadWithOverviewMode(false);
        ws.setGeolocationEnabled(true); // Habilita geolocalização no WebView

        // Configurações de zoom e toque (IMPORTANTE para interações)
        ws.setSupportZoom(true); // Habilita suporte a zoom
        ws.setBuiltInZoomControls(true); // Habilita controles de zoom
        ws.setDisplayZoomControls(false); // Oculta controles visuais de zoom

        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new WebAppInterface(), "Android");

        // Configura WebChromeClient para gerenciar permissões de geolocalização e mídia
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                // Verifica se as permissões já foram concedidas
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED) {
                    // Permissões já concedidas, permite geolocalização
                    callback.invoke(origin, true, false);
                } else {
                    // Solicita permissões
                    ActivityCompat.requestPermissions(MainActivity.this,
                            new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                            LOCATION_PERMISSION_REQUEST_CODE);
                    // Por enquanto, nega a permissão (será concedida após o usuário aceitar)
                    callback.invoke(origin, false, false);
                }
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                String[] resources = request.getResources();

                for (String resource : resources) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                        // Verifica se a permissão de microfone foi concedida
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                                == PackageManager.PERMISSION_GRANTED) {
                            // Permite acesso ao microfone
                            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                            Log.d("WebViewPermissions", "Permissão de microfone concedida para WebView");
                        } else {
                            // Nega acesso ao microfone
                            request.deny();
                            Log.d("WebViewPermissions", "Permissão de microfone negada para WebView");
                        }
                        return;
                    }
                }

                // Para outras permissões, nega por padrão
                request.deny();
            }
        });

        // Google Sign-In
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken("605508365980-m25cah4ngk3ukf3fofe4vps9sqgsojjo.apps.googleusercontent.com")
                .requestEmail()
                .build();
        googleSignInClient = GoogleSignIn.getClient(this, gso);

        // Verificar se permissões já foram concedidas ou puladas
        boolean permissionsHandled = sharedPreferences.getBoolean(KEY_PERMISSIONS_GRANTED, false) ||
                                   sharedPreferences.getBoolean(KEY_PERMISSIONS_SKIPPED, false);

        if (permissionsHandled) {
            // Já concedeu permissões, verificar se usuário está logado
            FirebaseUser currentUser = auth.getCurrentUser();
            if (currentUser != null) {
                // Usuário está logado, verificar perfil e redirecionar adequadamente
                Log.d("MainActivity", "Usuário logado, verificando perfil...");
                checkUserProfileAndRedirect(currentUser);
            } else {
                // Usuário não está logado, carregar index.html
                Log.d("MainActivity", "Usuário não logado, carregando index.html");
                webView.loadUrl("file:///android_asset/index.html");
            }
        } else {
            // Primeiro acesso, mostrar tela de permissões
            webView.loadUrl("file:///android_asset/permissions.html");
        }
    }

    private final ActivityResultLauncher<Intent> signInLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                Intent data = result.getData();
                if (data != null) {
                    try {
                        GoogleSignInAccount account = GoogleSignIn.getSignedInAccountFromIntent(data)
                                .getResult(ApiException.class);
                        firebaseAuthWithGoogle(account);
                    } catch (ApiException e) {
                        runOnUiThread(() -> webView.evaluateJavascript(
                                "onError('Falha no login Google: " + e.getMessage() + "')", null));
                    }
                }
            });

    private final ActivityResultLauncher<Intent> cameraLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                if (result.getResultCode() == RESULT_OK) {
                    Intent data = result.getData();
                    Bitmap photo = (Bitmap) data.getExtras().get("data");
                    uploadImageToFirebase(photo);
                }
            });

    private boolean isMessageImageSelection = false; // Flag para distinguir seleção de imagem para mensagens

    private final ActivityResultLauncher<String> galleryLauncher =
            registerForActivityResult(new ActivityResultContracts.GetContent(), uri -> {
                Log.d("GalleryLauncher", "Gallery result received, URI: " + (uri != null ? uri.toString() : "null"));
                Log.d("GalleryLauncher", "isMessageImageSelection: " + isMessageImageSelection);

                if (uri != null) {
                    try {
                        Log.d("GalleryLauncher", "Processando bitmap da URI...");
                        Bitmap bitmap = MediaStore.Images.Media.getBitmap(getContentResolver(), uri);
                        Log.d("GalleryLauncher", "Bitmap criado com sucesso, tamanho: " + bitmap.getWidth() + "x" + bitmap.getHeight());

                        // Verificar se é para mensagem ou perfil baseado no contexto
                        if (isMessageImageSelection) {
                            Log.d("GalleryLauncher", "Chamando processMessageImage...");
                            processMessageImage(bitmap);
                        } else {
                            Log.d("GalleryLauncher", "Chamando uploadImageToFirebase...");
                            uploadImageToFirebase(bitmap);
                        }
                    } catch (IOException e) {
                        Log.e("GalleryLauncher", "Erro ao processar imagem da galeria", e);
                        runOnUiThread(() -> webView.evaluateJavascript(
                                "onProfileImageError('Erro ao processar imagem: " + e.getMessage() + "')", null));
                    }
                } else {
                    Log.w("GalleryLauncher", "URI recebida é null");
                }
            });

    private void processMessageImage(Bitmap bitmap) {
        Log.d("MessageImage", "processMessageImage: Iniciando processamento da imagem");

        // Reset flag
        isMessageImageSelection = false;

        try {
            // Comprimir a imagem
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos);
            byte[] imageBytes = baos.toByteArray();

            Log.d("MessageImage", "processMessageImage: Imagem comprimida, tamanho: " + imageBytes.length + " bytes");

            // Converter para Base64
            String base64Image = Base64.encodeToString(imageBytes, Base64.DEFAULT);

            Log.d("MessageImage", "processMessageImage: Base64 gerado, tamanho: " + base64Image.length() + " caracteres");
            Log.d("MessageImage", "processMessageImage: Preview base64: " + base64Image.substring(0, Math.min(50, base64Image.length())) + "...");

            // Escapar caracteres especiais para JavaScript
            String escapedBase64 = base64Image.replace("\\", "\\\\")
                                             .replace("'", "\\'")
                                             .replace("\"", "\\\"")
                                             .replace("\n", "\\n")
                                             .replace("\r", "\\r");

            Log.d("MessageImage", "processMessageImage: Base64 escapado, tamanho: " + escapedBase64.length());

            // Enviar para JavaScript como callback
            String jsCall = "onMessageImageSelected('" + escapedBase64 + "', 'image/jpeg')";

            Log.d("MessageImage", "processMessageImage: Chamada JS: " + jsCall.substring(0, Math.min(100, jsCall.length())) + "...");

            runOnUiThread(() -> {
                webView.evaluateJavascript(jsCall, value -> {
                    Log.d("MessageImage", "processMessageImage: evaluateJavascript completado, resultado: " + value);
                });
            });

        } catch (Exception e) {
            Log.e("MessageImage", "processMessageImage: Erro ao processar imagem", e);
            runOnUiThread(() -> {
                webView.evaluateJavascript("console.error('Erro ao processar imagem: " + e.getMessage() + "')", null);
            });
        }
    }

    private void firebaseAuthWithGoogle(GoogleSignInAccount account) {
        AuthCredential credential = GoogleAuthProvider.getCredential(account.getIdToken(), null);
        auth.signInWithCredential(credential).addOnCompleteListener(this, task -> {
            if (task.isSuccessful() && auth.getCurrentUser() != null) {
                FirebaseUser user = auth.getCurrentUser();
                saveUserInDatabaseIfNew(user);
                checkUserProfileAndRedirect(user);
            } else {
                String errorMessage = task.getException() != null ?
                        task.getException().getMessage() : "Falha no login Google";
                runOnUiThread(() -> webView.evaluateJavascript(
                        "onError('" + errorMessage + "')", null));
            }
        });
    }

    // Método para salvar data de criação da conta no Realtime Database
    private void salvarDataCriacaoUsuario(String userId) {
        Log.d("DataCriacao", "Método salvarDataCriacaoUsuario chamado para usuário: " + userId);

        // Criar dados da conta com data de criação
        java.util.Map<String, Object> contaData = new java.util.HashMap<>();
        java.util.Date now = new java.util.Date();

        // Formatar data em ISO 8601
        java.text.SimpleDateFormat isoFormat = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
        isoFormat.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        String isoDate = isoFormat.format(now);

        contaData.put("dataCriacao", isoDate);
        contaData.put("timestamp", System.currentTimeMillis());
        contaData.put("dataFormatada", java.text.SimpleDateFormat.getDateTimeInstance(
                java.text.SimpleDateFormat.MEDIUM,
                java.text.SimpleDateFormat.MEDIUM,
                java.util.Locale.getDefault()).format(now));

        Log.d("DataCriacao", "Dados a serem salvos: " + contaData.toString());

        // Salvar no Realtime Database
        usersRef.child(userId).child("conta").setValue(contaData)
                .addOnSuccessListener(aVoid -> {
                    Log.d("DataCriacao", "✅ Data de criação salva com sucesso para usuário: " + userId);
                    Log.d("DataCriacao", "   Caminho: usuarios/" + userId + "/conta");
                    Log.d("DataCriacao", "   Dados salvos: " + contaData.toString());
                })
                .addOnFailureListener(e -> {
                    Log.e("DataCriacao", "❌ Erro ao salvar data de criação para usuário " + userId + ": " + e.getMessage());
                    Log.e("DataCriacao", "   Detalhes do erro: ", e);
                });
    }

    private void saveUserInDatabaseIfNew(FirebaseUser user) {
        usersRef.child(user.getUid()).get().addOnCompleteListener(task -> {
            if (task.isSuccessful() && !task.getResult().exists()) {
                String userId = user.getUid();
                String nome = user.getDisplayName() != null ? user.getDisplayName() : "";
                String email = user.getEmail() != null ? user.getEmail() : "";
                String fotoUrl = user.getPhotoUrl() != null ? user.getPhotoUrl().toString() : "";
                String telefone = user.getPhoneNumber() != null ? user.getPhoneNumber() : "";

                // Tentar obter data de nascimento do Google (se disponível)
                String dataNascimento = getBirthDateFromGoogleAccount();

                User u = new User(nome, email, telefone, userId, "", "", fotoUrl, dataNascimento, "");

                // Salvar dados do usuário
                usersRef.child(userId).setValue(u)
                        .addOnSuccessListener(aVoid -> {
                            // Salvar data de criação da conta no Realtime Database
                            salvarDataCriacaoUsuario(userId);
                        })
                        .addOnFailureListener(e -> {
                            Log.e("GoogleUserSave", "Erro ao salvar dados do usuário Google: " + e.getMessage());
                        });
            }
        });
    }

    private String getBirthDateFromGoogleAccount() {
        try {
            GoogleSignInAccount account = GoogleSignIn.getLastSignedInAccount(this);
            if (account != null) {
                // Nota: O Google Sign-In padrão não fornece data de nascimento
                // Para obter data de nascimento, seria necessário:
                // 1. Usar Google People API
                // 2. Solicitar escopo adicional: https://www.googleapis.com/auth/user.birthday.read
                // 3. Configurar OAuth consent screen no Google Cloud Console

                // Por enquanto, retornamos vazio, mas a estrutura está preparada
                // para implementação futura da Google People API

                /*
                // Exemplo de implementação com Google People API:
                People peopleService = new People.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    JacksonFactory.getDefaultInstance(),
                    getCredentials(account))
                    .setApplicationName("ConsertaJa")
                    .build();

                Person profile = peopleService.people().get("people/me")
                    .setPersonFields("birthdays")
                    .execute();

                if (profile.getBirthdays() != null && !profile.getBirthdays().isEmpty()) {
                    Birthday birthday = profile.getBirthdays().get(0);
                    if (birthday.getDate() != null) {
                        Date date = birthday.getDate();
                        String birthDate = String.format("%04d-%02d-%02d",
                            date.getYear(), date.getMonth(), date.getDay());
                        return birthDate;
                    }
                }
                */

                return ""; // Retorna vazio por enquanto
            }
        } catch (Exception e) {
            Log.e("GoogleBirthDate", "Erro ao obter data de nascimento: " + e.getMessage());
        }
        return "";
    }

    private void checkUserProfileAndRedirect(FirebaseUser user) {
        usersRef.child(user.getUid()).get().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                DataSnapshot snapshot = task.getResult();

                String tipoUsuario = snapshot.child("tipoUsuario").getValue(String.class);
                String cep = snapshot.child("cep").getValue(String.class);
                String ceps = snapshot.child("ceps").getValue(String.class);
                String nome = snapshot.child("nome").getValue(String.class);
                String email = snapshot.child("email").getValue(String.class);
                String telefone = snapshot.child("telefone").getValue(String.class);
                String fotoUrl = snapshot.child("fotoUrl").getValue(String.class);
                String dataNascimento = snapshot.child("dataNascimento").getValue(String.class);
                String cpfCnpj = snapshot.child("cpfCnpj").getValue(String.class);
                Boolean isFoodService = snapshot.child("isFoodService").getValue(Boolean.class);

                tipoUsuario = tipoUsuario != null ? tipoUsuario : "";
                cep = cep != null ? cep : "";
                ceps = ceps != null ? ceps : "";
                nome = nome != null ? nome : "";
                email = email != null ? email : "";
                telefone = telefone != null ? telefone : "";
                fotoUrl = fotoUrl != null ? fotoUrl : "";
                dataNascimento = dataNascimento != null ? dataNascimento : "";
                cpfCnpj = cpfCnpj != null ? cpfCnpj : "";

                // Debug: Log do telefone e isFoodService
                Log.d("UserProfile", "Telefone do banco: '" + telefone + "', length: " + telefone.length());
                Log.d("UserProfile", "isFoodService do banco: " + isFoodService);

                // Para usuários do Google, sempre usar a foto mais recente do Google
                // se ela for diferente da armazenada no banco
                String googlePhotoUrl = user.getPhotoUrl() != null ? user.getPhotoUrl().toString() : "";
                if (!googlePhotoUrl.isEmpty() && !googlePhotoUrl.equals(fotoUrl)) {
                    // Atualizar foto no banco de dados com a foto do Google
                    usersRef.child(user.getUid()).child("fotoUrl").setValue(googlePhotoUrl);
                    fotoUrl = googlePhotoUrl;
                }

                // Usar CEPs se disponível, senão usar CEP antigo
                String finalLocationData = !ceps.isEmpty() ? ceps : cep;

                User userData = new User(nome, email, telefone, user.getUid(), tipoUsuario, finalLocationData, fotoUrl, dataNascimento, cpfCnpj);
                // Definir isFoodService - sempre definir, mesmo que seja false/null
                userData.isFoodService = isFoodService != null ? isFoodService : false;
                Log.d("UserProfile", "isFoodService definido no userData: " + userData.isFoodService);
                String jsonUser = gson.toJson(userData).replace("'", "\\'");

                String finalTipoUsuario = tipoUsuario;
                String finalLocation = finalLocationData;
                runOnUiThread(() -> {
                    // 1. Atualiza localStorage
                    webView.evaluateJavascript("localStorage.setItem('user', '" + jsonUser + "');", value -> {
                        // 2. Só depois carrega a página correta
                        if(finalLocation.isEmpty()) {
                            webView.loadUrl("file:///android_asset/confirma_local.html");
                        } else if(finalTipoUsuario.isEmpty()) {
                            webView.loadUrl("file:///android_asset/tipo_user.html");
                        } else {
                            webView.loadUrl("file:///android_asset/home.html");
                        }
                    });
                });
            } else {
                runOnUiThread(() -> webView.evaluateJavascript(
                        "onError('Erro ao verificar perfil do usuário')", null));
            }
        });
    }

    // ================= WebAppInterface =================
    public class WebAppInterface {

        @JavascriptInterface
        public void checkEmailExists(String email) {
            auth.fetchSignInMethodsForEmail(email)
                    .addOnCompleteListener(task -> {
                        if (task.isSuccessful()) {
                            boolean emailExists = !task.getResult().getSignInMethods().isEmpty();
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onEmailCheckResult(" + emailExists + ")", null));
                        } else {
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onError('Erro ao verificar email')", null));
                        }
                    });
        }

        @JavascriptInterface
        public void checkPhoneExists(String phoneNumber) {
            // Formata o número para o padrão internacional
            String originalPhone = phoneNumber;
            if (!phoneNumber.startsWith("+55")) {
                phoneNumber = "+55" + phoneNumber.replaceAll("[^0-9]", "");
            }

            final String formattedPhone = phoneNumber;
            Log.d("PhoneCheck", "Verificando telefone - Original: " + originalPhone + ", Formatado: " + formattedPhone);

            // Verifica no banco de dados se o telefone já existe
            usersRef.orderByChild("telefone").equalTo(phoneNumber)
                    .addListenerForSingleValueEvent(new com.google.firebase.database.ValueEventListener() {
                        @Override
                        public void onDataChange(DataSnapshot snapshot) {
                            boolean phoneExists = snapshot.exists();
                            Log.d("PhoneCheck", "Telefone " + formattedPhone + " existe: " + phoneExists);
                            if (phoneExists) {
                                Log.d("PhoneCheck", "Dados encontrados:");
                                for (DataSnapshot child : snapshot.getChildren()) {
                                    Log.d("PhoneCheck", "Usuário: " + child.getKey() + " - " + child.getValue());
                                }
                            }
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onPhoneCheckResult(" + phoneExists + ")", null));
                        }

                        @Override
                        public void onCancelled(com.google.firebase.database.DatabaseError error) {
                            Log.e("PhoneCheck", "Erro ao verificar telefone: " + error.getMessage());
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onError('Erro ao verificar telefone')", null));
                        }
                    });
        }

        @JavascriptInterface
        public void createUserWithEmail(String email, String senha, String nome, String nascimento) {
            auth.createUserWithEmailAndPassword(email, senha)
                    .addOnCompleteListener(task -> {
                        if (task.isSuccessful() && auth.getCurrentUser() != null) {
                            FirebaseUser user = auth.getCurrentUser();
                            User u = new User(nome, email, "", user.getUid(), "", "", "", nascimento, "");

                            // Salvar dados do usuário
                            usersRef.child(user.getUid()).setValue(u)
                                    .addOnSuccessListener(aVoid -> {
                                        // Salvar data de criação da conta no Realtime Database
                                        salvarDataCriacaoUsuario(user.getUid());

                                        runOnUiThread(() -> webView.evaluateJavascript(
                                                "onSuccess('Conta criada com sucesso!')", null));
                                        checkUserProfileAndRedirect(user);
                                    })
                                    .addOnFailureListener(e -> runOnUiThread(() -> webView.evaluateJavascript(
                                            "onError('Erro ao salvar dados do usuário: " + e.getMessage() + "')", null)));
                        } else {
                            String errorMessage;
                            if (task.getException() != null) {
                                if (task.getException().getMessage().contains("email-already-in-use")) {
                                    errorMessage = "Este email já está cadastrado";
                                } else {
                                    errorMessage = task.getException().getMessage();
                                }
                            } else {
                                errorMessage = "Erro ao criar conta";
                            }
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onError('" + errorMessage + "')", null));
                        }
                    });
        }

        @JavascriptInterface
        public void loginWithEmail(String email, String senha) {
            auth.signInWithEmailAndPassword(email, senha)
                    .addOnCompleteListener(task -> {
                        if (task.isSuccessful() && auth.getCurrentUser() != null) {
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onSuccess('Login realizado com sucesso!')", null));
                            checkUserProfileAndRedirect(auth.getCurrentUser());
                        } else {
                            String errorMessage;
                            if (task.getException() != null) {
                                String exceptionMessage = task.getException().getMessage();
                                if (exceptionMessage.contains("user-not-found") ||
                                        exceptionMessage.contains("INVALID_LOGIN_CREDENTIALS")) {
                                    errorMessage = "Usuário não encontrado. Crie uma conta primeiro.";
                                } else if (exceptionMessage.contains("wrong-password")) {
                                    errorMessage = "Senha incorreta";
                                } else if (exceptionMessage.contains("invalid-email")) {
                                    errorMessage = "Email inválido";
                                } else {
                                    errorMessage = "Erro: " + exceptionMessage;
                                }
                            } else {
                                errorMessage = "Falha no login";
                            }
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onError('" + errorMessage + "')", null));
                        }
                    });
        }

        @JavascriptInterface
        public void loginWithGoogle() {
            Intent signInIntent = googleSignInClient.getSignInIntent();
            signInLauncher.launch(signInIntent);
        }

        @JavascriptInterface
        public void loginWithTwitter() {
            // Para Twitter/X, você precisará implementar a autenticação Twitter
            // Isso pode ser feito usando Twitter Kit ou OAuth 2.0

            // Por enquanto, vamos mostrar uma mensagem informativa
            runOnUiThread(() -> webView.evaluateJavascript(
                    "onError('Login com Twitter/X ainda não implementado. Use Google ou email/telefone.')", null));

            // Implementação futura:
            /*
            // Exemplo de implementação com Twitter Kit:
            TwitterAuthClient authClient = new TwitterAuthClient();
            authClient.authorize(this, new Callback<TwitterSession>() {
                @Override
                public void success(Result<TwitterSession> result) {
                    // Sucesso - processar o resultado
                    TwitterSession session = result.data;
                    String userName = session.getUserName();
                    // Continuar com o fluxo de login...
                }

                @Override
                public void failure(TwitterException exception) {
                    // Erro
                    runOnUiThread(() -> webView.evaluateJavascript(
                            "onError('Erro no login Twitter: " + exception.getMessage() + "')", null));
                }
            });
            */
        }

        @JavascriptInterface
        public void sendPasswordResetEmail(String email) {
            auth.sendPasswordResetEmail(email)
                    .addOnCompleteListener(task -> {
                        if (task.isSuccessful()) {
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.')", null));
                        } else {
                            String errorMessage;
                            if (task.getException() != null) {
                                errorMessage = task.getException().getMessage();
                            } else {
                                errorMessage = "Erro ao enviar email de recuperação";
                            }
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onError('" + errorMessage + "')", null));
                        }
                    });
        }

        @JavascriptInterface
        public void sendPhonePasswordReset(String phoneNumber) {
            // Para telefone, vamos reenviar o código SMS para permitir login
            // Formata o número para o padrão internacional
            if (!phoneNumber.startsWith("+55")) {
                phoneNumber = "+55" + phoneNumber.replaceAll("[^0-9]", "");
            }

            PhoneAuthOptions options = PhoneAuthOptions.newBuilder(auth)
                    .setPhoneNumber(phoneNumber)
                    .setTimeout(60L, TimeUnit.SECONDS)
                    .setActivity(MainActivity.this)
                    .setCallbacks(new PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                        @Override
                        public void onVerificationCompleted(PhoneAuthCredential credential) {
                            // Auto-verificação (emulador ou dispositivo confiável)
                            signInWithPhoneCredential(credential);
                        }

                        @Override
                        public void onVerificationFailed(@NonNull FirebaseException e) {

                        }

                        public void onVerificationFailed(Exception e) {
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onError('Falha na verificação: " + e.getMessage() + "')", null));
                        }

                        @Override
                        public void onCodeSent(String verificationId, PhoneAuthProvider.ForceResendingToken token) {
                            MainActivity.this.verificationId = verificationId;
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onPhoneCodeSent('Código SMS enviado! Digite o código para fazer login.')", null));
                        }
                    })
                    .build();

            PhoneAuthProvider.verifyPhoneNumber(options);
        }

        @JavascriptInterface
        public void sendPhoneVerification(String phoneNumber) {
            // Formata o número para o padrão internacional
            if (!phoneNumber.startsWith("+55")) {
                phoneNumber = "+55" + phoneNumber.replaceAll("[^0-9]", "");
            }

            String finalPhoneNumber = phoneNumber;
            PhoneAuthOptions options = PhoneAuthOptions.newBuilder(auth)
                    .setPhoneNumber(phoneNumber)
                    .setTimeout(60L, TimeUnit.SECONDS)
                    .setActivity(MainActivity.this)
                    .setCallbacks(new PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                        @Override
                        public void onVerificationCompleted(PhoneAuthCredential credential) {
                            // Auto-verificação (emulador ou dispositivo confiável)
                            signInWithPhoneCredentialForCreation(credential,        finalPhoneNumber);
                        }

                        @Override
                        public void onVerificationFailed(@NonNull FirebaseException e) {

                        }

                        public void onVerificationFailed(Exception e) {
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onError('Falha na verificação: " + e.getMessage() + "')", null));
                        }

                        @Override
                        public void onCodeSent(String verificationId, PhoneAuthProvider.ForceResendingToken token) {
                            MainActivity.this.verificationId = verificationId;
                            MainActivity.this.isForCreation = true; // Flag para indicar que é para criação
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onPhoneCodeSent('Código SMS enviado!')", null));
                        }
                    })
                    .build();

            PhoneAuthProvider.verifyPhoneNumber(options);
        }

        @JavascriptInterface
        public void verifyPhoneCode(String code) {
            if (verificationId != null) {
                PhoneAuthCredential credential = PhoneAuthProvider.getCredential(verificationId, code);
                if (isForCreation) {
                    // Para criação de conta, obter o telefone do usuário logado
                    FirebaseUser user = auth.getCurrentUser();
                    String userPhone = user != null ? user.getPhoneNumber() : "";
                    if (userPhone == null) userPhone = "";
                    signInWithPhoneCredentialForCreation(credential, userPhone);
                } else {
                    // Para login, verificar se usuário existe
                    signInWithPhoneCredential(credential);
                }
                // Resetar flag após uso
                isForCreation = false;
            } else {
                runOnUiThread(() -> webView.evaluateJavascript(
                        "onError('ID de verificação não encontrado')", null));
            }
        }

        private void signInWithPhoneCredential(PhoneAuthCredential credential) {
            auth.signInWithCredential(credential)
                    .addOnCompleteListener(task -> {
                        if (task.isSuccessful() && auth.getCurrentUser() != null) {
                            FirebaseUser user = auth.getCurrentUser();

                            // Para login com telefone, verificar se usuário existe no banco
                            // Formatar o telefone do usuário logado
                            String userPhone = user.getPhoneNumber();
                            if (userPhone != null) {
                                if (!userPhone.startsWith("+55")) {
                                    userPhone = "+55" + userPhone.replaceAll("[^0-9]", "");
                                }

                                // Verificar se existe no banco de dados
                                usersRef.orderByChild("telefone").equalTo(userPhone)
                                        .addListenerForSingleValueEvent(new com.google.firebase.database.ValueEventListener() {
                                            @Override
                                            public void onDataChange(DataSnapshot snapshot) {
                                                if (snapshot.exists()) {
                                                    // Usuário existe, permitir login
                                                    runOnUiThread(() -> webView.evaluateJavascript(
                                                            "onSuccess('Login com telefone realizado com sucesso!')", null));
                                                    checkUserProfileAndRedirect(user);
                                                } else {
                                                    // Usuário não existe, fazer logout e mostrar erro
                                                    auth.signOut();
                                                    runOnUiThread(() -> webView.evaluateJavascript(
                                                            "onError('Telefone não cadastrado. Crie uma conta primeiro.')", null));
                                                }
                                            }

                                            @Override
                                            public void onCancelled(com.google.firebase.database.DatabaseError error) {
                                                // Em caso de erro, fazer logout por segurança
                                                auth.signOut();
                                                runOnUiThread(() -> webView.evaluateJavascript(
                                                        "onError('Erro ao verificar conta: " + error.getMessage() + "')", null));
                                            }
                                        });
                            } else {
                                // Telefone não disponível, fazer logout
                                auth.signOut();
                                runOnUiThread(() -> webView.evaluateJavascript(
                                        "onError('Erro: Telefone não identificado')", null));
                            }
                        } else {
                            String errorMessage;
                            if (task.getException() != null) {
                                errorMessage = task.getException().getMessage();
                            } else {
                                errorMessage = "Falha no login com telefone";
                            }
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onError('" + errorMessage + "')", null));
                        }
                    });
        }

        private void signInWithPhoneCredentialForCreation(PhoneAuthCredential credential, String phoneNumber) {
            auth.signInWithCredential(credential)
                    .addOnCompleteListener(task -> {
                        if (task.isSuccessful() && auth.getCurrentUser() != null) {
                            FirebaseUser user = auth.getCurrentUser();

                            // Para criação de conta, não verificar se existe - apenas salvar dados
                            // Os dados serão salvos pelo método createUserWithPhone chamado do JavaScript
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onPhoneCodeVerified('" + phoneNumber + "')", null));
                        } else {
                            String errorMessage;
                            if (task.getException() != null) {
                                errorMessage = task.getException().getMessage();
                            } else {
                                errorMessage = "Falha na verificação do código SMS";
                            }
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onError('" + errorMessage + "')", null));
                        }
                    });
        }

        @JavascriptInterface
        public void createUserWithPhone(String phoneNumber, String nome, String nascimento) {
            // Este método é chamado após verificação SMS bem-sucedida
            // O usuário já está logado, só precisa salvar os dados adicionais
            FirebaseUser user = auth.getCurrentUser();
            if (user != null) {
                // Formata o número para o padrão internacional
                if (!phoneNumber.startsWith("+55")) {
                    phoneNumber = "+55" + phoneNumber.replaceAll("[^0-9]", "");
                }

                User u = new User(nome, "", phoneNumber, user.getUid(), "", "", "", nascimento, "");
                usersRef.child(user.getUid()).setValue(u)
                        .addOnSuccessListener(aVoid -> {
                            // Salvar data de criação da conta no Realtime Database
                            salvarDataCriacaoUsuario(user.getUid());

                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onSuccess('Conta criada com sucesso!')", null));
                            checkUserProfileAndRedirect(user);
                        })
                        .addOnFailureListener(e -> runOnUiThread(() -> webView.evaluateJavascript(
                                "onError('Erro ao salvar dados do usuário: " + e.getMessage() + "')", null)));
            } else {
                runOnUiThread(() -> webView.evaluateJavascript(
                        "onError('Usuário não está logado')", null));
            }
        }

        // Método para salvar data de criação da conta no Realtime Database
        private void salvarDataCriacaoUsuario(String userId) {
            Log.d("DataCriacao", "Método salvarDataCriacaoUsuario chamado para usuário: " + userId);

            // Criar dados da conta com data de criação
            java.util.Map<String, Object> contaData = new java.util.HashMap<>();
            java.util.Date now = new java.util.Date();

            // Formatar data em ISO 8601
            java.text.SimpleDateFormat isoFormat = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
            isoFormat.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            String isoDate = isoFormat.format(now);

            contaData.put("dataCriacao", isoDate);
            contaData.put("timestamp", System.currentTimeMillis());
            contaData.put("dataFormatada", java.text.SimpleDateFormat.getDateTimeInstance(
                    java.text.SimpleDateFormat.MEDIUM,
                    java.text.SimpleDateFormat.MEDIUM,
                    java.util.Locale.getDefault()).format(now));

            Log.d("DataCriacao", "Dados a serem salvos: " + contaData.toString());

            // Salvar no Realtime Database
            usersRef.child(userId).child("conta").setValue(contaData)
                    .addOnSuccessListener(aVoid -> {
                        Log.d("DataCriacao", "✅ Data de criação salva com sucesso para usuário: " + userId);
                        Log.d("DataCriacao", "   Caminho: usuarios/" + userId + "/conta");
                        Log.d("DataCriacao", "   Dados salvos: " + contaData.toString());
                    })
                    .addOnFailureListener(e -> {
                        Log.e("DataCriacao", "❌ Erro ao salvar data de criação para usuário " + userId + ": " + e.getMessage());
                        Log.e("DataCriacao", "   Detalhes do erro: ", e);
                    });
        }

        @JavascriptInterface
        public void logout() {
            auth.signOut();
            googleSignInClient.signOut().addOnCompleteListener(task ->
                    runOnUiThread(() -> {
                        webView.loadUrl("file:///android_asset/index.html");
                        webView.evaluateJavascript("localStorage.clear();", null);
                        webView.evaluateJavascript("onSuccess('Logout realizado!')", null);
                    })
            );
        }

        @JavascriptInterface
        public void updateUserCep(String cep) {
            FirebaseUser user = auth.getCurrentUser();
            if(user != null){
                usersRef.child(user.getUid()).child("cep").setValue(cep)
                        .addOnSuccessListener(aVoid -> runOnUiThread(() -> {
                            // Atualiza localStorage também
                            usersRef.child(user.getUid()).get().addOnCompleteListener(task -> {
                                if(task.isSuccessful()){
                                    DataSnapshot snap = task.getResult();
                                    String tipoUsuario = snap.child("tipoUsuario").getValue(String.class);
                                    String nome = snap.child("nome").getValue(String.class);
                                    String email = snap.child("email").getValue(String.class);
                                    String telefone = snap.child("telefone").getValue(String.class);
                                    String fotoUrl = snap.child("fotoUrl").getValue(String.class);
                                    String dataNascimento = snap.child("dataNascimento").getValue(String.class);
                                    String cpfCnpj = snap.child("cpfCnpj").getValue(String.class);

                                    User userData = new User(nome,email,telefone,user.getUid(),tipoUsuario,cep,fotoUrl,dataNascimento,cpfCnpj);
                                    String jsonUser = gson.toJson(userData);
                                    // Usa aspas simples para delimitar e escapa aspas simples no JSON
                                    String escapedJson = jsonUser.replace("'", "\\'");
                                    webView.evaluateJavascript("localStorage.setItem('user', '" + escapedJson + "');", null);
                                    webView.evaluateJavascript("onSuccess('CEP atualizado!')", null);
                                }
                            });
                        }))
                        .addOnFailureListener(e -> runOnUiThread(() ->
                                webView.evaluateJavascript("onError('Erro ao atualizar CEP')", null)));
            } else {
                runOnUiThread(() -> webView.evaluateJavascript("onError('Usuário não está logado')", null));
            }
        }

        @JavascriptInterface
        public void updateUserTipo(String tipo) {
            FirebaseUser user = auth.getCurrentUser();
            if(user != null){
                usersRef.child(user.getUid()).child("tipoUsuario").setValue(tipo)
                        .addOnSuccessListener(aVoid -> runOnUiThread(() -> {
                            // Atualiza localStorage
                            usersRef.child(user.getUid()).get().addOnCompleteListener(task -> {
                                if(task.isSuccessful()){
                                    DataSnapshot snap = task.getResult();
                                    String cep = snap.child("cep").getValue(String.class);
                                    String nome = snap.child("nome").getValue(String.class);
                                    String email = snap.child("email").getValue(String.class);
                                    String telefone = snap.child("telefone").getValue(String.class);
                                    String fotoUrl = snap.child("fotoUrl").getValue(String.class);
                                    String dataNascimento = snap.child("dataNascimento").getValue(String.class);
                                    String cpfCnpj = snap.child("cpfCnpj").getValue(String.class);

                                    User userData = new User(nome,email,telefone,user.getUid(),tipo,cep,fotoUrl,dataNascimento,cpfCnpj);
                                    String jsonUser = gson.toJson(userData);
                                    // Usa aspas simples para delimitar e escapa aspas simples no JSON
                                    String escapedJson = jsonUser.replace("'", "\\'");
                                    webView.evaluateJavascript("localStorage.setItem('user', '" + escapedJson + "');", null);
                                    webView.evaluateJavascript("onSuccess('Tipo atualizado!')", null);
                                }
                            });
                        }))
                        .addOnFailureListener(e -> runOnUiThread(() ->
                                webView.evaluateJavascript("onError('Erro ao atualizar tipo')", null)));
            } else {
                runOnUiThread(() -> webView.evaluateJavascript("onError('Usuário não está logado')", null));
            }
        }

        @JavascriptInterface
        public void deleteCurrentUser() {
            FirebaseUser user = auth.getCurrentUser();
            if (user != null) {
                String uid = user.getUid();

                // 1. Apagar do Realtime Database
                usersRef.child(uid).removeValue()
                        .addOnCompleteListener(task -> {
                            if (task.isSuccessful()) {
                                // 2. Apagar também da autenticação (opcional)
                                user.delete().addOnCompleteListener(delTask -> {
                                    runOnUiThread(() -> {
                                        webView.evaluateJavascript("localStorage.clear();", null);
                                        webView.loadUrl("file:///android_asset/index.html");
                                        if (delTask.isSuccessful()) {
                                            webView.evaluateJavascript("onSuccess('Cadastro cancelado com sucesso!')", null);
                                        } else {
                                            webView.evaluateJavascript("onError('Usuário removido do banco, mas falhou em excluir da autenticação.')", null);
                                        }
                                    });
                                });
                            } else {
                                runOnUiThread(() -> webView.evaluateJavascript(
                                        "onError('Erro ao remover usuário do banco: " + task.getException().getMessage() + "')", null));
                            }
                        });
            } else {
                runOnUiThread(() -> webView.evaluateJavascript(
                        "onError('Nenhum usuário logado para excluir')", null));
            }
        }

        @JavascriptInterface
        public void updateUserField(String field, String value) {
            FirebaseUser user = auth.getCurrentUser();
            if (user != null) {
                // Mapear nomes vindos do JS para os nomes usados no Firebase
                String firebaseField = field;
                switch (field) {
                    case "phone":
                        firebaseField = "telefone";
                        break;
                    case "birthDate":
                        firebaseField = "dataNascimento";
                        break;
                    case "ceps":
                        firebaseField = "ceps";
                        break;
                    case "cpfCnpj":
                        firebaseField = "cpfCnpj";
                        break;
                    case "email":
                        firebaseField = "email";
                        break;
                    case "isFoodService":
                        firebaseField = "isFoodService";
                        break;
                }

                // Atualizar campo no Firebase
                Object firebaseValue;
                if ("isFoodService".equals(firebaseField)) {
                    // Converter string para boolean
                    firebaseValue = Boolean.parseBoolean(value);
                    Log.d("UpdateUserField", "Atualizando isFoodService - valor original: " + value + ", convertido para boolean: " + firebaseValue);
                } else {
                    firebaseValue = value;
                }
                String finalFirebaseField = firebaseField;
                String finalFirebaseField1 = firebaseField;
                String finalFirebaseField2 = firebaseField;
                usersRef.child(user.getUid()).child(firebaseField).setValue(firebaseValue)
                        .addOnSuccessListener(aVoid -> {
                            Log.d("UpdateUserField", "Campo " + finalFirebaseField2 + " salvo no Firebase com sucesso");
                            // Após salvar, recarregar os dados completos do usuário
                            usersRef.child(user.getUid()).get().addOnCompleteListener(task -> {
                                if (task.isSuccessful()) {
                                    User updatedUser = task.getResult().getValue(User.class);
                                    if (updatedUser != null) {
                                        // Garantir que isFoodService seja preservado corretamente
                                        if ("isFoodService".equals(finalFirebaseField)) {
                                            updatedUser.isFoodService = (Boolean) firebaseValue;
                                            Log.d("UpdateUserField", "isFoodService definido no objeto User: " + updatedUser.isFoodService);
                                        }

                                        String jsonUser = gson.toJson(updatedUser).replace("'", "\\'");
                                        Log.d("UpdateUserField", "JSON do usuário atualizado: " + jsonUser);
                                        runOnUiThread(() -> {
                                            // Atualiza localStorage no WebView
                                            webView.evaluateJavascript(
                                                    "localStorage.setItem('user', '" + jsonUser + "');", null
                                            );
                                            webView.evaluateJavascript(
                                                    "onSuccess('Campo atualizado com sucesso!')", null
                                            );
                                        });
                                    }
                                } else {
                                    Log.e("UpdateUserField", "Erro ao recarregar dados do usuário: " + task.getException().getMessage());
                                }
                            });
                        })
                        .addOnFailureListener(e -> {
                            Log.e("UpdateUserField", "Erro ao atualizar campo " + finalFirebaseField1 + ": " + e.getMessage());
                            runOnUiThread(() -> webView.evaluateJavascript(
                                    "onError('Erro ao atualizar campo: " + e.getMessage() + "')", null));
                        });
            } else {
                runOnUiThread(() -> webView.evaluateJavascript("onError('Usuário não está logado')", null));
            }
        }

        @JavascriptInterface
        public void refreshUserData() {
            FirebaseUser user = auth.getCurrentUser();
            if (user != null) {
                usersRef.child(user.getUid()).get().addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        DataSnapshot snapshot = task.getResult();

                        String tipoUsuario = snapshot.child("tipoUsuario").getValue(String.class);
                        String ceps = snapshot.child("ceps").getValue(String.class);
                        String nome = snapshot.child("nome").getValue(String.class);
                        String email = snapshot.child("email").getValue(String.class);
                        String telefone = snapshot.child("telefone").getValue(String.class);
                        String fotoUrl = snapshot.child("fotoUrl").getValue(String.class);
                        String dataNascimento = snapshot.child("dataNascimento").getValue(String.class);
                        String cpfCnpj = snapshot.child("cpfCnpj").getValue(String.class);
                        Boolean isFoodService = snapshot.child("isFoodService").getValue(Boolean.class);

                        tipoUsuario = tipoUsuario != null ? tipoUsuario : "";
                        ceps = ceps != null ? ceps : "";
                        nome = nome != null ? nome : "";
                        email = email != null ? email : "";
                        telefone = telefone != null ? telefone : "";
                        fotoUrl = fotoUrl != null ? fotoUrl : "";
                        dataNascimento = dataNascimento != null ? dataNascimento : "";
                        cpfCnpj = cpfCnpj != null ? cpfCnpj : "";

                        User userData = new User(nome, email, telefone, user.getUid(), tipoUsuario, ceps, fotoUrl, dataNascimento, cpfCnpj);
                        // Definir isFoodService - sempre definir, mesmo que seja false/null
                        userData.isFoodService = isFoodService != null ? isFoodService : false;
                        String jsonUser = gson.toJson(userData).replace("'", "\\'");

                        runOnUiThread(() -> {
                            webView.evaluateJavascript("localStorage.setItem('user', '" + jsonUser + "');", value -> {
                                webView.evaluateJavascript("onSuccess('Dados do usuário atualizados!')", null);
                            });
                        });
                    } else {
                        runOnUiThread(() -> webView.evaluateJavascript(
                                "onError('Erro ao atualizar dados do usuário')", null));
                    }
                });
            } else {
                runOnUiThread(() -> webView.evaluateJavascript("onError('Usuário não está logado')", null));
            }
        }

        @JavascriptInterface
        public void saveUserCeps(String cepsJson) {
            FirebaseUser user = auth.getCurrentUser();
            if (user != null) {
                usersRef.child(user.getUid()).child("ceps").setValue(cepsJson)
                        .addOnSuccessListener(aVoid -> {
                            // Atualizar dados completos do usuário no localStorage
                            usersRef.child(user.getUid()).get().addOnCompleteListener(task -> {
                                if (task.isSuccessful()) {
                                    DataSnapshot snapshot = task.getResult();
                                    String tipoUsuario = snapshot.child("tipoUsuario").getValue(String.class);
                                    String cep = snapshot.child("cep").getValue(String.class);
                                    String nome = snapshot.child("nome").getValue(String.class);
                                    String email = snapshot.child("email").getValue(String.class);
                                    String telefone = snapshot.child("telefone").getValue(String.class);
                                    String fotoUrl = snapshot.child("fotoUrl").getValue(String.class);
                                    String dataNascimento = snapshot.child("dataNascimento").getValue(String.class);
                                    String cpfCnpj = snapshot.child("cpfCnpj").getValue(String.class);

                                    tipoUsuario = tipoUsuario != null ? tipoUsuario : "";
                                    cep = cep != null ? cep : "";
                                    nome = nome != null ? nome : "";
                                    email = email != null ? email : "";
                                    telefone = telefone != null ? telefone : "";
                                    fotoUrl = fotoUrl != null ? fotoUrl : "";
                                    dataNascimento = dataNascimento != null ? dataNascimento : "";
                                    cpfCnpj = cpfCnpj != null ? cpfCnpj : "";

                                    User userData = new User(nome, email, telefone, user.getUid(), tipoUsuario, cepsJson, fotoUrl, dataNascimento, cpfCnpj);
                                    String jsonUser = gson.toJson(userData).replace("'", "\\'");

                                    runOnUiThread(() -> {
                                        webView.evaluateJavascript("localStorage.setItem('user', '" + jsonUser + "');", value -> {
                                            webView.evaluateJavascript("onSuccess('CEP salvo com sucesso!')", null);
                                        });
                                    });
                                }
                            });
                        })
                        .addOnFailureListener(e -> runOnUiThread(() -> webView.evaluateJavascript(
                                "onError('Erro ao salvar CEPs')", null)));
            } else {
                runOnUiThread(() -> webView.evaluateJavascript("onError('Usuário não está logado')", null));
            }
        }

        @JavascriptInterface
        public void loadUserCeps() {
            FirebaseUser user = auth.getCurrentUser();
            if (user != null) {
                usersRef.child(user.getUid()).child("ceps").get().addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        String cepsJson = task.getResult().getValue(String.class);
                        if (cepsJson != null && !cepsJson.isEmpty()) {
                            runOnUiThread(() -> {
                                webView.evaluateJavascript("localStorage.setItem('userCeps', '" + cepsJson.replace("'", "\\'") + "');", value -> {
                                    webView.evaluateJavascript("loadCeps();", null);
                                });
                            });
                        }
                    }
                });
            } else {
                runOnUiThread(() -> webView.evaluateJavascript("onError('Usuário não está logado')", null));
            }
        }

        @JavascriptInterface
        public void updateGeolocation(String ceps) {
            // Aqui você pode implementar a lógica para atualizar a geolocalização
            // baseada no CEP fornecido
            runOnUiThread(() -> webView.evaluateJavascript(
                    "onSuccess('Geolocalização atualizada para CEP: " + ceps + "')", null));
        }

        @JavascriptInterface
        public void selectProfileImage(String source) {
            runOnUiThread(() -> {
                if ("camera".equals(source)) {
                    Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    if (cameraIntent.resolveActivity(getPackageManager()) != null) {
                        cameraLauncher.launch(cameraIntent);
                    } else {
                        webView.evaluateJavascript("onProfileImageError('Câmera não disponível')", null);
                    }
                } else if ("gallery".equals(source)) {
                    galleryLauncher.launch("image/*");
                }
            });
        }

        @JavascriptInterface
        public void selectMessageImage() {
            runOnUiThread(() -> {
                isMessageImageSelection = true; // Definir flag para indicar que é seleção de imagem para mensagem
                galleryLauncher.launch("image/*");
            });
        }

        @JavascriptInterface
        public void requestAllPermissions() {
            runOnUiThread(() -> {
                // Solicitar todas as permissões essenciais de uma vez
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    String[] permissionsArray;

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { // Android 13+
                        // Solicitar todas as permissões necessárias para Android 13+
                        permissionsArray = new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.RECORD_AUDIO,
                            Manifest.permission.READ_MEDIA_IMAGES,
                            Manifest.permission.READ_MEDIA_AUDIO
                        };
                    } else { // Android 12 e anteriores
                        // Solicitar permissões para versões anteriores
                        permissionsArray = new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.RECORD_AUDIO,
                            Manifest.permission.READ_EXTERNAL_STORAGE
                        };
                    }

                    Log.d("Permissions", "Solicitando permissões: " + java.util.Arrays.toString(permissionsArray));
                    ActivityCompat.requestPermissions(MainActivity.this, permissionsArray, LOCATION_PERMISSION_REQUEST_CODE);
                }
            });
        }

        @JavascriptInterface
        public void setPermissionsGranted() {
            MainActivity.this.setPermissionsGranted();
        }

        @JavascriptInterface
        public void setPermissionsSkipped() {
            MainActivity.this.setPermissionsSkipped();
        }

        @JavascriptInterface
        public String checkPermissionsStatus() {
            // Verificar status de todas as permissões necessárias
            boolean locationGranted = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED;
            boolean audioGranted = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                    == PackageManager.PERMISSION_GRANTED;

            boolean mediaGranted;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+
                boolean imagesGranted = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_MEDIA_IMAGES)
                        == PackageManager.PERMISSION_GRANTED;
                boolean audioMediaGranted = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_MEDIA_AUDIO)
                        == PackageManager.PERMISSION_GRANTED;
                mediaGranted = imagesGranted && audioMediaGranted;
            } else {
                // Android 12 e anteriores
                mediaGranted = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_EXTERNAL_STORAGE)
                        == PackageManager.PERMISSION_GRANTED;
            }

            boolean allGranted = locationGranted && audioGranted && mediaGranted;

            // Retornar JSON com status
            return String.format("{\"allGranted\": %b, \"location\": %b, \"audio\": %b, \"media\": %b}",
                    allGranted, locationGranted, audioGranted, mediaGranted);
        }

        @JavascriptInterface
        public String getPaneleiros() {
            final String[] result = {null};

            // Verificar se usuário está logado
            FirebaseUser currentUser = auth.getCurrentUser();
            if (currentUser == null) {
                return "[]";
            }

            // Buscar paneleiros
            usersRef.orderByChild("tipoUsuario").equalTo("Paneleiro")
                    .addListenerForSingleValueEvent(new com.google.firebase.database.ValueEventListener() {
                        @Override
                        public void onDataChange(DataSnapshot snapshot) {
                            java.util.ArrayList<User> paneleiros = new java.util.ArrayList<>();

                            for (DataSnapshot userSnapshot : snapshot.getChildren()) {
                                User user = userSnapshot.getValue(User.class);
                                if (user != null) {
                                    paneleiros.add(user);
                                }
                            }

                            // Converter para JSON
                            String jsonResult = gson.toJson(paneleiros);
                            result[0] = jsonResult;
                        }

                        @Override
                        public void onCancelled(com.google.firebase.database.DatabaseError error) {
                            result[0] = "[]";
                        }
                    });

            // Aguardar processamento
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            return result[0] != null ? result[0] : "[]";
        }
    }

    private void uploadImageToFirebase(Bitmap bitmap) {
        FirebaseUser user = auth.getCurrentUser();
        if (user == null) {
            runOnUiThread(() -> webView.evaluateJavascript(
                    "onProfileImageError('Usuário não está logado')", null));
            return;
        }

        // Comprimir a imagem
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos);
        byte[] imageBytes = baos.toByteArray();

        // Converter para Base64
        String base64Image = Base64.encodeToString(imageBytes, Base64.DEFAULT);
        String dataUrl = "data:image/jpeg;base64," + base64Image;

        // Salvar no Firebase Realtime Database
        usersRef.child(user.getUid()).child("fotoUrl").setValue(dataUrl)
                .addOnSuccessListener(aVoid -> {
                    // Atualizar localStorage
                    usersRef.child(user.getUid()).get().addOnCompleteListener(task -> {
                        if (task.isSuccessful()) {
                            User updatedUser = task.getResult().getValue(User.class);
                            if (updatedUser != null) {
                                String jsonUser = gson.toJson(updatedUser).replace("'", "\\'");
                                runOnUiThread(() -> {
                                    webView.evaluateJavascript(
                                            "localStorage.setItem('user', '" + jsonUser + "');", null);
                                    webView.evaluateJavascript(
                                            "onProfileImageSelected({url: '" + dataUrl + "'})", null);
                                });
                            }
                        }
                    });
                })
                .addOnFailureListener(e -> runOnUiThread(() -> webView.evaluateJavascript(
                        "onProfileImageError('Erro ao salvar imagem: " + e.getMessage() + "')", null)));
    }

    // ================= Métodos de Permissões =================

    private void requestAllPermissionsAtStartup() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            java.util.ArrayList<String> permissionsToRequest = new java.util.ArrayList<>();

            // Verificar localização
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION);
                permissionsToRequest.add(Manifest.permission.ACCESS_COARSE_LOCATION);
            }

            // Verificar microfone
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.RECORD_AUDIO);
                permissionsToRequest.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
            }

            // Verificar mídia baseada na versão do Android
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { // Android 13+
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES)
                        != PackageManager.PERMISSION_GRANTED) {
                    permissionsToRequest.add(Manifest.permission.READ_MEDIA_IMAGES);
                }
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {
                    permissionsToRequest.add(Manifest.permission.READ_MEDIA_AUDIO);
                }
            } else { // Android 12 e anteriores
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
                        != PackageManager.PERMISSION_GRANTED) {
                    permissionsToRequest.add(Manifest.permission.READ_EXTERNAL_STORAGE);
                }
            }

            // Solicitar todas as permissões de uma vez se houver alguma pendente
            if (!permissionsToRequest.isEmpty()) {
                String[] permissionsArray = permissionsToRequest.toArray(new String[0]);
                ActivityCompat.requestPermissions(this, permissionsArray, LOCATION_PERMISSION_REQUEST_CODE);
            }
        }
    }

    private void requestLocationPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) {

                // Solicita permissões de localização
                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                        LOCATION_PERMISSION_REQUEST_CODE);
            }
        }
    }

    private void requestAudioPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED ||
                    ContextCompat.checkSelfPermission(this, Manifest.permission.MODIFY_AUDIO_SETTINGS)
                    != PackageManager.PERMISSION_GRANTED) {

                // Solicita permissões de áudio
                ActivityCompat.requestPermissions(this,
                        new String[]{
                            Manifest.permission.RECORD_AUDIO,
                            Manifest.permission.MODIFY_AUDIO_SETTINGS
                        },
                        AUDIO_PERMISSION_REQUEST_CODE);
            }
        }
    }

    private void requestGalleryPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Verificar permissões baseadas na versão do Android
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { // Android 13+
                // Verificar se alguma das permissões de mídia não foi concedida
                boolean imagesGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES)
                        == PackageManager.PERMISSION_GRANTED;
                boolean audioGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_AUDIO)
                        == PackageManager.PERMISSION_GRANTED;

                if (!imagesGranted || !audioGranted) {
                    // Solicita permissões para Android 13+
                    ActivityCompat.requestPermissions(this,
                            new String[]{Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_AUDIO},
                            GALLERY_PERMISSION_REQUEST_CODE);
                }
            } else { // Android 12 e anteriores
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
                        != PackageManager.PERMISSION_GRANTED) {
                    // Solicita permissões para versões anteriores
                    ActivityCompat.requestPermissions(this,
                            new String[]{Manifest.permission.READ_EXTERNAL_STORAGE},
                            GALLERY_PERMISSION_REQUEST_CODE);
                }
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            // Verificar o status de cada permissão solicitada
            boolean locationGranted = false;
            boolean audioGranted = false;
            boolean mediaImagesGranted = false;
            boolean mediaAudioGranted = false;
            boolean storageGranted = false;

            for (int i = 0; i < permissions.length; i++) {
                String permission = permissions[i];
                boolean granted = grantResults[i] == PackageManager.PERMISSION_GRANTED;

                if (permission.equals(Manifest.permission.ACCESS_FINE_LOCATION) ||
                    permission.equals(Manifest.permission.ACCESS_COARSE_LOCATION)) {
                    locationGranted = granted;
                } else if (permission.equals(Manifest.permission.RECORD_AUDIO) ||
                          permission.equals(Manifest.permission.MODIFY_AUDIO_SETTINGS)) {
                    audioGranted = granted;
                } else if (permission.equals(Manifest.permission.READ_MEDIA_IMAGES)) {
                    mediaImagesGranted = granted;
                } else if (permission.equals(Manifest.permission.READ_MEDIA_AUDIO)) {
                    mediaAudioGranted = granted;
                } else if (permission.equals(Manifest.permission.READ_EXTERNAL_STORAGE)) {
                    storageGranted = granted;
                }
            }

            // Verificar se todas as permissões foram concedidas
            boolean allPermissionsGranted = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+: verificar localização, microfone e mídia (imagens + áudio)
                allPermissionsGranted = locationGranted && audioGranted && mediaImagesGranted && mediaAudioGranted;
            } else {
                // Android 12 e anteriores: verificar localização, microfone e armazenamento
                allPermissionsGranted = locationGranted && audioGranted && storageGranted;
            }

            // Se todas as permissões foram concedidas, mostrar botão "Próximo"
            if (allPermissionsGranted) {
                runOnUiThread(() -> {
                    webView.evaluateJavascript("onPermissionsGranted()", null);
                });
            } else {
                // Notificar sobre cada tipo de permissão individualmente
                if (locationGranted) {
                    runOnUiThread(() -> {
                        webView.evaluateJavascript("onSuccess('Permissões de localização concedidas!')", null);
                    });
                } else {
                    runOnUiThread(() -> {
                        webView.evaluateJavascript("onError('Permissões de localização negadas. A detecção automática não funcionará.')", null);
                    });
                }

                if (audioGranted) {
                    runOnUiThread(() -> {
                        webView.evaluateJavascript("onSuccess('Permissões de microfone concedidas!')", null);
                    });
                } else {
                    runOnUiThread(() -> {
                        webView.evaluateJavascript("onError('Permissões de microfone negadas. A gravação de áudio não funcionará.')", null);
                    });
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    if (mediaImagesGranted && mediaAudioGranted) {
                        runOnUiThread(() -> {
                            webView.evaluateJavascript("onSuccess('Permissões de mídia concedidas!')", null);
                        });
                    } else {
                        runOnUiThread(() -> {
                            webView.evaluateJavascript("onError('Permissões de mídia negadas. Não será possível acessar arquivos de mídia.')", null);
                        });
                    }
                } else {
                    if (storageGranted) {
                        runOnUiThread(() -> {
                            webView.evaluateJavascript("onSuccess('Permissões de galeria concedidas!')", null);
                        });
                    } else {
                        runOnUiThread(() -> {
                            webView.evaluateJavascript("onError('Permissões de galeria negadas. Não será possível selecionar imagens da galeria.')", null);
                        });
                    }
                }
            }
        }
    }

    // ================= Métodos de SharedPreferences =================

    private void setPermissionsGranted() {
        SharedPreferences.Editor editor = sharedPreferences.edit();
        editor.putBoolean(KEY_PERMISSIONS_GRANTED, true);
        editor.apply();
    }

    private void setPermissionsSkipped() {
        SharedPreferences.Editor editor = sharedPreferences.edit();
        editor.putBoolean(KEY_PERMISSIONS_SKIPPED, true);
        editor.apply();
    }

    // ================= User model =================
    public static class User {
        public String nome, email, telefone, id, tipoUsuario, ceps, fotoUrl, dataNascimento, cpfCnpj;
        public boolean isFoodService;
        public User(){}
        public User(String nome, String email, String telefone, String id, String tipoUsuario, String ceps, String fotoUrl, String dataNascimento, String cpfCnpj){
            this.nome = nome;
            this.email = email;
            this.telefone = telefone;
            this.id = id;
            this.tipoUsuario = tipoUsuario;
            this.ceps = ceps;
            this.fotoUrl = fotoUrl;
            this.dataNascimento = dataNascimento;
            this.cpfCnpj = cpfCnpj;
            this.isFoodService = false; // Default value
        }
    }
}
