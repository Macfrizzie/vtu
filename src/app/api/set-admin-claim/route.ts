
import { type NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    // You must set these environment variables in your deployment environment
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

export async function POST(req: NextRequest) {
    try {
        const { uid } = await req.json();

        if (!uid) {
            return NextResponse.json({ message: 'UID is required' }, { status: 400 });
        }
        
        await admin.auth().setCustomUserClaims(uid, { admin: true });

        return NextResponse.json({ message: `Custom claim set for user ${uid}` }, { status: 200 });
    } catch (error) {
        console.error('Error setting custom claim:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

