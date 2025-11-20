
import { EventEmitter } from 'events';

// Since we're in a single-threaded Node.js environment on the server (for 'use server' components)
// and on the client, a simple EventEmitter instance is sufficient.
// We are disabling the max listeners warning as this is a legitimate use case for a central emitter.
const errorEmitter = new EventEmitter();
errorEmitter.setMaxListeners(0);

export { errorEmitter };
