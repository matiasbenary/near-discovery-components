const { actionName, actionUndoName, item, notifyAccountId } = props;

const [isActive, setIsActive] = useState(null);

const actions = Social.index(actionName, item);
const isLoading = !actions;
const actionsByUsers = {};
(actions || []).forEach((action) => {
  if (action.value.type === actionName) {
    actionsByUsers[action.accountId] = action;
  } else if (action.value.type === actionUndoName) {
    delete actionsByUsers[action.accountId];
  }
});

if (actionsByUsers[context.accountId] && isActive === null) {
  setIsActive(true);
}

if (isActive !== null) {
  if (isActive) {
    actionsByUsers[context.accountId] = {
      accountId: context.accountId,
    };
  } else {
    delete actionsByUsers[context.accountId];
  }
}

const count = Object.keys(actionsByUsers).length;

const onClick = () => {
  if (isLoading || !context.accountId) {
    return;
  }

  const type = isActive ? actionUndoName : actionName;
  const data = {
    index: {
      star: JSON.stringify({
        key: item,
        value: {
          type,
        },
      }),
    },
  };

  if (item.type === "social" && typeof item.path === "string") {
    const keys = item.path.split("/");
    if (keys.length > 0) {
      data.graph = {
        [actionName]: {},
      };
      let root = data.graph[actionName];
      keys.slice(0, -1).forEach((key) => {
        root = root[key] = {};
      });
      root[keys[keys.length - 1]] = isActive ? null : "";
    }
  }

  if (!isActive && notifyAccountId && context.accountId !== notifyAccountId) {
    data.index.notify = JSON.stringify({
      key: notifyAccountId,
      value: {
        type,
        item,
      },
    });
  }

  setIsActive((currentIsActive) => !currentIsActive);

  Social.set(data, {
    onCancel: () => setIsActive((currentIsActive) => !currentIsActive),
  });
};

return props.button(count, isActive, onClick);
