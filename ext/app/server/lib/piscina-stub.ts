import * as workerExporter from 'app/server/lib/workerExporter';

class PiscinaStub {
  public static isWorkerThread = false;
}

console.log(workerExporter);

export default PiscinaStub;
