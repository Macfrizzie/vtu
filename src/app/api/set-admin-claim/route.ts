
import { type NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Helper function to initialize Firebase Admin SDK
// This ensures it's only initialized once.
function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please add it to your .env.local file.');
    }
    
    // Sanity check if the key is still a placeholder
    if (serviceAccountString.includes('"..."')) {
            throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY is still a placeholder. Please replace it with your actual service account key in .env.local.');
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountString);
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error: any) {
        throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it's a valid JSON. Error: ${error.message}`);
    }
}


export async function POST(req: NextRequest) {
    try {
        initializeFirebaseAdmin();
    } catch (error: any) {
        console.error('Firebase Admin SDK Initialization Error:', error);
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }

    try {
        const { uid } = await req.json();

        if (!uid) {
            return NextResponse.json({ message: 'UID is required' }, { status: 400 });
        }
        
        await admin.auth().setCustomUserClaims(uid, { admin: true });

        return NextResponse.json({ message: `Custom claim set for user ${uid}` }, { status: 200 });
    } catch (error) {
        console.error('Error setting custom claim:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
    }
}
