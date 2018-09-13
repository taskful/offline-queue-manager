import uuidv4 from 'uuid/v4';

let _currentQueue;
let _fetch = () => {
  const error = 'onFetch must to be overridden.';
  throw error;
};
let _filter;
let _getState = () => {
  const error = 'getState must to be overridden.';
  throw error;
};
let _isConnected = true;
let _isSameItem = () => false;
let _onLoading = () => {};
let _queue;
let _reducer = 'queue';
let _removeFromQueue = () => {
  const error = 'onRemoveFromQueue must to be overridden.';
  throw error;
};
let _sort;
let _busy = false;

const _runQueue = (queue = _currentQueue) => {
  queue.forEach(item => _fetch(item));
  const oldItems = [];
  const oldQueue = _currentQueue;
  oldQueue.forEach(item => oldItems.push(item.uuid));
  _removeFromQueue(oldItems);

  const state = _getState();
  _queue = _filter ? _filter(state[_reducer]) : state[_reducer];
  if (_queue.length > 0) {
    checkQueue(true); // eslint-disable-line
  } else {
    _busy = false;
    _onLoading(false);
  }
};

const _parseQueue = async () => {
  let parsedQueue = [];
  const creates = _currentQueue.filter(item => (item.type === 'CREATE'));
  let edits = _currentQueue.filter(item => (item.type === 'EDIT'));
  let deletes = _currentQueue.filter(item => (item.type === 'DELETE'));
  const otherTypeItems = _currentQueue.filter(item => (item.type !== 'CREATE' && item.type !== 'EDIT' && item.type !== 'DELETE'));
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
            type: 'CREATE',
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

const checkQueue = (continuing) => {
  try {
    const state = _getState();
    _queue = _filter ? _filter(state[_reducer]) : state[_reducer];
    if (_isConnected && _queue.length > 0 && (_busy === false || continuing)) {
      _busy = true;
      _onLoading(true, _queue.length);
      _currentQueue = JSON.parse(JSON.stringify(_queue));
      if (_currentQueue.length > 1) {
        _parseQueue();
      } else {
        _runQueue();
      }
    }
  } catch (error) {
    throw (error);
  }
};

const createItem = ({ type, data, object }) => ({
  type,
  data,
  object,
  uuid: uuidv4(),
  timestamp: Date.now(),
});

const setFetch = (fetch) => {
  _fetch = fetch;
};

const setFilter = (filter) => {
  _filter = filter;
};

const setGetState = (getState) => {
  _getState = getState;
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

const setReducer = (reducer) => {
  _reducer = reducer;
};

const setRemoveFromQueue = (removeFromQueue) => {
  _removeFromQueue = removeFromQueue;
};

const setSort = (sort) => {
  _sort = sort;
};

module.exports = {
  checkQueue,
  createItem,
  setFetch,
  setFilter,
  setGetState,
  setIsConnected,
  setIsSameItem,
  setOnLoading,
  setReducer,
  setRemoveFromQueue,
  setSort,
};
