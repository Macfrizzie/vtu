
import { type NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
try {
    if (!admin.apps.length) {
        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountString) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
        }
        
        // Sanity check if the key is still a placeholder
        if (serviceAccountString.includes('"..."')) {
             throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY is still a placeholder. Please replace it with your actual service account key in .env.local.');
        }

        const serviceAccount = JSON.parse(serviceAccountString);
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} catch (error) {
    console.error('Firebase Admin SDK Initialization Error:', error);
    // We will let the POST handler deal with the response, but log the init error.
}


export async function POST(req: NextRequest) {
    // Check if the Admin SDK was initialized correctly
    if (!admin.apps.length) {
        return NextResponse.json({ message: 'Internal Server Error: Firebase Admin SDK not initialized. Check server logs for details.' }, { status: 500 });
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
