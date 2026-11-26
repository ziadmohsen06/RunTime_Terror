import { ItemStatus } from '../../../src/domain/enums/ItemStatus';
import { InvalidTransitionError } from '../../../src/domain/errors/InvalidTransitionError';
import { ItemStatusMachine } from '../../../src/services/laundry/status/ItemStatusMachine';
import { FakeCareRules, FakeIroningQueue } from './fakes';

// State pattern (US-L7): what each state DOES, not only where it may go.
//  - nextStatus: where an item goes when its load advances (the state decides)
//  - onEnter:    the side effect when an item enters the state (ironing joins the queue)
describe('item state behaviour', () => {
  let queue: FakeIroningQueue;
  let machine: ItemStatusMachine;
  const linen = { id: 7, userId: 1, fabric: 'linen' }; // needs ironing (FakeCareRules)
  const cotton = { id: 8, userId: 1, fabric: 'cotton' }; // does not

  beforeEach(() => {
    queue = new FakeIroningQueue();
    machine = new ItemStatusMachine(new FakeCareRules(), queue);
  });

  describe('nextStatus (when the load advances)', () => {
    it('IN_LAUNDRY goes to WASHING', () => {
      expect(machine.nextStatus({ ...cotton, status: ItemStatus.IN_LAUNDRY })).toBe(ItemStatus.WASHING);
    });

    it('WASHING goes to DRYING', () => {
      expect(machine.nextStatus({ ...cotton, status: ItemStatus.WASHING })).toBe(ItemStatus.DRYING);
    });

    it('DRYING goes to IRONING when the fabric needs ironing', () => {
      expect(machine.nextStatus({ ...linen, status: ItemStatus.DRYING })).toBe(ItemStatus.IRONING);
    });

    it('DRYING goes straight to CLEAN when the fabric does not need ironing', () => {
      expect(machine.nextStatus({ ...cotton, status: ItemStatus.DRYING })).toBe(ItemStatus.CLEAN);
    });

    it.each([ItemStatus.CLEAN, ItemStatus.DIRTY, ItemStatus.IRONING])(
      '%s is not part of a load, so it has no next status',
      (status) => {
        expect(() => machine.nextStatus({ ...cotton, status })).toThrow(InvalidTransitionError);
      }
    );
  });

  describe('onEnter (side effects)', () => {
    it('entering IRONING adds the item to the ironing queue', async () => {
      await machine.enter(linen, ItemStatus.IRONING);
      expect(queue.enqueued).toEqual([[1, 7]]);
    });

    it.each([
      ItemStatus.CLEAN,
      ItemStatus.DIRTY,
      ItemStatus.IN_LAUNDRY,
      ItemStatus.WASHING,
      ItemStatus.DRYING,
    ])('entering %s does not touch the ironing queue', async (status) => {
      await machine.enter(linen, status);
      expect(queue.enqueued).toHaveLength(0);
    });

    it('a failing queue makes enter() fail, so the caller can undo', async () => {
      queue.failForItemIds.add(linen.id);
      await expect(machine.enter(linen, ItemStatus.IRONING)).rejects.toThrow('enqueue failed');
    });
  });

  it('a machine built without collaborators still checks the rules', () => {
    const rulesOnly = new ItemStatusMachine();
    expect(rulesOnly.canTransition(ItemStatus.CLEAN, ItemStatus.DIRTY)).toBe(true);
    expect(rulesOnly.canTransition(ItemStatus.CLEAN, ItemStatus.WASHING)).toBe(false);
  });
});
