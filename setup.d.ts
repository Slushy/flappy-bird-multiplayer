import type { Express, Router } from 'express';
import type { Server } from 'socket.io';

export interface SetupOptions {
  app: Express;
  io: Server;
}

export default function setup(options: SetupOptions): Promise<Router>;
