import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

android {
    compileSdk = 36
    namespace = "com.ania.android.stream.desk"
    defaultConfig {
        // LAN-only macro pad — WS connects via ws:// to Companion on local network.
        // No HTTPS available, must allow cleartext in every build type.
        manifestPlaceholders["usesCleartextTraffic"] = "true"
        applicationId = "com.ania.android.stream.desk"
        minSdk = 24
        targetSdk = 36
        // arm64-v8a  = modern 64-bit Android (API 21+, covers 2015+ devices)
        // armeabi-v7a = 32-bit ARM for older devices (the primary target of this app)
        // x86/x86_64 omitted — emulator-only, not shipped to real devices
        ndk { abiFilters += listOf("arm64-v8a", "armeabi-v7a") }
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    val keystorePropsFile = file("keystore.properties")
    if (keystorePropsFile.exists()) {
        try {
            val keystoreProps = Properties().apply { load(keystorePropsFile.inputStream()) }
            val sf = keystoreProps.getProperty("storeFile")
            val sp = keystoreProps.getProperty("storePassword")
            val ka = keystoreProps.getProperty("keyAlias")
            val kp = keystoreProps.getProperty("keyPassword")
            if (sf != null && sp != null && ka != null && kp != null) {
                signingConfigs {
                    create("release") {
                        storeFile = file(sf)
                        storePassword = sp
                        keyAlias = ka
                        keyPassword = kp
                    }
                }
            } else {
                println("keystore.properties: missing required properties — signing skipped")
            }
        } catch (e: Exception) {
            println("keystore.properties load failed: ${e.message} — signing skipped")
        }
    }

    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            isMinifyEnabled = true
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
            signingConfigs.findByName("release")?.let { signingConfig = it }
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }

    applicationVariants.all {
        val variant = this
        outputs.all {
            val out = this as com.android.build.gradle.internal.api.BaseVariantOutputImpl
            val ver = variant.versionName.replace('.', '_')
            val isUnsigned = variant.buildType.name == "release" && variant.signingConfig == null
            val suffix = if (variant.buildType.name == "debug") "-debug" else if (isUnsigned) "-unsigned" else ""
            out.outputFileName = "android-stream-desk-v${ver}${suffix}.apk"
        }
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-process:2.10.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = "tauri.build.gradle.kts")