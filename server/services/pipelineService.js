// pipelineService.js
const pipelines = new Map();

function startPipeline(clientId) {
  pipelines.set(clientId, []);
}

function discardPipeline(clientId) {
  pipelines.delete(clientId);
}

function queueCommand(clientId, commandObj) {
  if (pipelines.has(clientId)) {
    pipelines.get(clientId).push(commandObj);
    return true;
  }
  return false;
}

function isInPipeline(clientId) {
  return pipelines.has(clientId);
}

function getPipeline(clientId) {
  return pipelines.get(clientId) || [];
}

function execPipeline(clientId) {
  const queued = pipelines.get(clientId) || [];
  pipelines.delete(clientId);
  return queued;
}

module.exports = {
  startPipeline,
  discardPipeline,
  queueCommand,
  execPipeline,
  isInPipeline,
  getPipeline,
};
