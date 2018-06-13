uildscript {
    // ...
    dependencies {
        // ...
        classpath 'com.google.gms:google-services:4.0.1' // google-services plugin
    }
}

allprojects {
    // ...
    repositories {
        // ...
        google() // Google's Maven repository
    }
}
