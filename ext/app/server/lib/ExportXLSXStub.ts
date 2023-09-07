import * as workerExporter from 'app/server/lib/workerExporter';
import { ActiveDoc } from 'app/server/lib/ActiveDoc';
import * as express from 'express';
import {Writable} from 'stream';
import {ExportParameters} from 'app/server/lib/Export';
import { ActiveDocSourceDirect } from 'app/server/lib/Export';

export async function streamXLSX(activeDoc: ActiveDoc, req: express.Request,
                                 outputStream: Writable, options: ExportParameters) {
  const testDates = (req.hostname === 'localhost');
  const activeDocSource = new ActiveDocSourceDirect(activeDoc, req);
  const result = await workerExporter.doMakeXLSXFromOptions(activeDocSource, testDates, undefined as any, options);
  (outputStream as any).send(result);
}
