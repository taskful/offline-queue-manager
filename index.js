const uuidv4 = require('uuid/v4');

let _currentQueue;
let _fetch = () => {
  const error = 'onFetch must to be overridden.';
  throw error;
};
let _filter;
let _getQueue = () => {
  const error = 'getQueue must to be overridden.';
  throw error;
};
let _isConnected = true;
let _isSameItem = () => false;
let _onLoading = () => {};
let _queue;
let _removeFromQueue = () => {
  const error = 'onRemoveFromQueue must to be overridden.';
  throw error;
};
let _sort;
let _busy = false;

const _runQueue = async (queue = _currentQueue) => {
  _fetch(queue, () => {
    const oldItems = [];
    const oldQueue = _currentQueue;
    oldQueue.forEach(item => oldItems.push(item.uuid));
    _removeFromQueue(oldItems);

    _queue = _filter ? _filter(_getQueue()) : _getQueue();
    if (_queue.length > 0) {
      checkQueue(false, true); // eslint-disable-line
    } else {
      _busy = false;
      _onLoading(false, []);
    }
  });
};

const _parseQueue = async () => {
  let parsedQueue = [];
  const creates = _currentQueue.filter(item => (item.method === 'CREATE'));
  let edits = _currentQueue.filter(item => (item.method === 'EDIT'));
  let deletes = _currentQueue.filter(item => (item.method === 'DELETE'));
  const otherTypeItems = _currentQueue.filter(item => (item.method !== 'CREATE' && item.method !== 'EDIT' && item.method !== 'DELETE'));
  let relatedCreates = [];
  let relatedEdits = [];
  let relatedDeletes = [];

  // CHECK IF ITEM WAS CREATED AND THEN DELETED.
  // IF SO, REMOVE ANY OTHER CHANGES IN THE QUEUE TO THE SAME ITEM.
  creates.forEach((item) => {
    relatedEdits = edits.filter(editedItem => _isSameItem(item, editedItem));
    relatedDeletes = deletes.filter(deletedItem => _isSameItem(item, deletedItem));
    if (relatedEdits.length === 0 && relatedDeletes.length === 0) {
      const createNotInQueue = parsedQueue.filter(parsedItem => _isSameItem(item, parsedItem)).length === 0;
      if (createNotInQueue) {
        parsedQueue.push(item);
      }
    } else if (relatedDeletes.length > 0) {
      edits = edits.filter(editedItem => !_isSameItem(item, editedItem));
      deletes = deletes.filter(deletedItem => !_isSameItem(item, deletedItem));
    }
  });

  // ONLY QUEUE THE LAST EDIT IF THERE ARE MULTIPLE AND THE ITEM HAS NOT BEEN DELETED.
  edits.forEach((item) => {
    relatedCreates = creates.filter(createdItem => _isSameItem(item, createdItem));
    relatedEdits = edits.filter(editedItem => _isSameItem(item, editedItem)).sort((a, b) => (b.timestamp - a.timestamp)); // Sort by most recent edit
    let lastEdit = relatedEdits[0]; // Grab the most recent edit
    relatedDeletes = deletes.filter(deletedItem => _isSameItem(item, deletedItem));
    if (relatedDeletes.length === 0) {
      const editNotInQueue = parsedQueue.filter(parsedItem => _isSameItem(item, parsedItem)).length === 0;
      if (editNotInQueue) {
        if (relatedCreates.length > 0) {
          lastEdit = {
            ...lastEdit,
            method: 'CREATE',
          };
        }
        parsedQueue.push(lastEdit);
      }
    }
  });

  // ANY DELETES THAT ARE LEFT WILL BE ADDED TO THE QUEUE.
  parsedQueue = parsedQueue.concat(deletes);

  // ADD THE REMAINING TYPES TO THE QUEUE.
  parsedQueue = parsedQueue.concat(otherTypeItems);

  if (_sort) parsedQueue = parsedQueue.sort(_sort);

  _runQueue(parsedQueue);
};

const checkQueue = (force = false, continuing = false) => setTimeout(() => {
  try {
    _queue = _filter ? _filter(_getQueue(), force) : _getQueue();
    if (_isConnected && _queue.length > 0 && (_busy === false || continuing)) {
      _busy = true;
      _currentQueue = [..._queue];
      if (!continuing) {
        _onLoading(true, _currentQueue);
      }
      if (_currentQueue.length > 1) {
        _parseQueue();
      } else {
        _runQueue();
      }
    }
  } catch (error) {
    throw (error);
  }
}, 0);

const createItem = ({ method, payload, type, meta = null }) => ({
  method,
  payload,
  type,
  uuid: uuidv4(),
  timestamp: Date.now(),
  meta,
});

const setFetch = (fetch) => {
  _fetch = fetch;
};

const setFilter = (filter) => {
  _filter = filter;
};

const setGetQueue = (getQueue) => {
  _getQueue = getQueue;
};

const setIsConnected = (isConnected) => {
  _isConnected = isConnected;
};

const setIsSameItem = (isSameItem) => {
  _isSameItem = isSameItem;
};

const setOnLoading = (onLoading) => {
  _onLoading = onLoading;
};

const setRemoveFromQueue = (removeFromQueue) => {
  _removeFromQueue = removeFromQueue;
};

const setSort = (sort) => {
  _sort = sort;
};

const initOfflineQueue = (options) => {
  const {
    fetch,
    filter,
    getQueue,
    isConnected,
    isSameItem,
    onLoading,
    removeFromQueue,
    sort,
  } = options;

  if (fetch) {
    _fetch = fetch;
  }
  if (filter) {
    _filter = filter;
  }
  if (getQueue) {
    _getQueue = getQueue;
  }
  if (isConnected) {
    _isConnected = isConnected;
  }
  if (isSameItem) {
    _isSameItem = isSameItem;
  }
  if (onLoading) {
    _onLoading = onLoading;
  }
  if (removeFromQueue) {
    _removeFromQueue = removeFromQueue;
  }
  if (sort) {
    _sort = sort;
  }
};

const OfflineQueueManager = {
  checkQueue,
  createItem,
  initOfflineQueue,
  setFetch,
  setFilter,
  setGetQueue,
  setIsConnected,
  setIsSameItem,
  setOnLoading,
  setRemoveFromQueue,
  setSort,
};

module.exports = OfflineQueueManager;
