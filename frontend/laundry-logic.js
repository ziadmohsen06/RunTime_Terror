// Laundry page rules that need no browser: stage order, button labels and error messages.
// laundry.js uses these; the unit tests run this file on its own.
// The server is always the authority. These rules only decide what the page shows.
(function () {
  const STAGES = [
    { key: 'pending', label: 'Pending' },
    { key: 'washing', label: 'Washing' },
    { key: 'drying', label: 'Drying' },
    { key: 'done', label: 'Done' },
  ];

  // The text on the button that moves a load to its next stage.
  const ADVANCE_LABELS = { pending: 'Start washing', washing: 'Start drying', drying: 'Finish load' };

  function stageIndex(stage) {
    return STAGES.findIndex((s) => s.key === stage);
  }

  function nextStage(stage) {
    const at = stageIndex(stage);
    return at === -1 || at === STAGES.length - 1 ? null : STAGES[at + 1].key;
  }

  function advanceLabel(stage) {
    return ADVANCE_LABELS[stage] || null;
  }

  // Items can only leave a load before washing starts (the item state machine allows
  // in_laundry -> dirty and nothing later). The page just hides a button the server would refuse.
  function canRemoveItems(stage) {
    return stage === 'pending';
  }

  // Unfinished loads first, finished loads last; newest first inside each group.
  function sortLoads(loads) {
    const unfinished = (load) => (load.stage === 'done' ? 1 : 0);
    return loads.slice().sort((a, b) => unfinished(a) - unfinished(b) || b.id - a.id);
  }

  function sentence(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return '';
    return /[.!?]$/.test(trimmed) ? trimmed : trimmed + '.';
  }

  // The API answers { error: { message } }. People never see that JSON: every status becomes
  // a plain sentence. action is what the person was doing:
  // 'load' | 'markDirty' | 'createLoad' | 'advance' | 'remove'.
  function describeError(status, serverMessage, action) {
    if (!status) return 'Could not reach the server. Check your connection and try again.';
    switch (status) {
      case 400:
        return (
          sentence(serverMessage) ||
          (action === 'createLoad'
            ? 'Please select at least one item and try again.'
            : 'Please check what you entered and try again.')
        );
      case 401:
        return 'Your session has expired. Sending you to the login page...';
      case 404:
        return 'That item or load no longer exists. The page has been refreshed.';
      case 409:
        if (action === 'remove') return 'You can only remove an item before washing starts.';
        if (action === 'advance') return 'This load cannot move to the next stage.';
        if (action === 'markDirty') return 'That item is already dirty or in the laundry.';
        return sentence(serverMessage) || 'That change is not allowed right now.';
      default:
        return 'Something went wrong on the server (error ' + status + '). Please try again.';
    }
  }

  window.LaundryLogic = { STAGES, stageIndex, nextStage, advanceLabel, canRemoveItems, sortLoads, describeError };
})();
