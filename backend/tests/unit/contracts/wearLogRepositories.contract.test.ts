import { InMemoryWearLogRepository } from '../../../src/repositories/implementations/InMemoryWearLogRepository';
import { describeWearLogRepositoryContract } from './wearLogRepositoryContract';

describeWearLogRepositoryContract('InMemoryWearLogRepository', () => new InMemoryWearLogRepository());