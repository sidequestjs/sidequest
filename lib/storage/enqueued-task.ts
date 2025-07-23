export default interface EnqueuedTask {
  id: string,
  performAt: Date,
  enqueuedAt: Date,
  params: Array<any> | undefined,
  task: string,
}