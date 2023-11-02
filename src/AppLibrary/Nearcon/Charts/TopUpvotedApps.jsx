const filterTag = props.categoryFilter || undefined;
const topLimit = props.topLimit || 10;
const title = props.title || undefined;
const width = props.width || "600px";
const height = props.height || "400px";

State.init({
  isLoading: true,
  apps: props.apps || [],
  NoDataAvalaible: false,
  chartConfig: undefined,
});

const IMPLICIT_ACCOUNT_MAX_LENGTH = 64;
const isImplicitAccount = (accountId) =>
  accountId &&
  accountId.length === IMPLICIT_ACCOUNT_MAX_LENGTH &&
  !accountId.includes(".");

const ACCOUNT_ID_SEPARATOR = "...";

const shortenAccountId = (id, startChars, endChars) => {
  const numOfRemainingChars =
    startChars + endChars + ACCOUNT_ID_SEPARATOR.length;
  const isOutOfScope =
    id.length < numOfRemainingChars ||
    numOfRemainingChars > IMPLICIT_ACCOUNT_MAX_LENGTH;
  const isInvalidCharCount = startChars < 1 || endChars < 1;

  if (!isImplicitAccount(id) || isOutOfScope || isInvalidCharCount) {
    return id;
  }

  return `${id.slice(0, startChars)}${ACCOUNT_ID_SEPARATOR}${id.slice(
    id.length - endChars
  )}`;
};

const shortenWidgetName = (widgetName, startChars, endChars) => {
  const parts = widgetName.split("/");
  if (parts.length < 3) return widgetName;

  const accountId = parts[0];
  const shortenedAccountId = shortenAccountId(accountId, startChars, endChars);

  return `${shortenedAccountId}/${parts[1]}/${parts[2]}`;
};

const createChartConfig = (apps) => {
  const filteredApps = filterTag
    ? apps.filter((app) => app.tags && app.tags.includes(filterTag))
    : apps;
  const topApps = filteredApps
    .filter((app) => app.votes > 0)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, topLimit);
  const appNames = topApps.map((app) =>
    shortenWidgetName(app.widget_name, 4, 4)
  );
  const appVotes = topApps.map((app) => app.votes);
  if (topApps.length == 0) {
    State.update({
      NoDataAvalaible: true,
    });
  }
  const chartConfig = {
    tooltip: {
      trigger: "axis",
      confine: true,
      axisPointer: {
        type: "shadow",
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      containLabel: true,
    },
    yAxis: {
      type: "category",
      data: appNames,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        show: true,
        formatter: (value) => {
          return value.length > 10 ? value.substring(0, 10) + "..." : value;
        },
      },
      boundaryGap: true,
    },
    xAxis: {
      type: "value",
      boundaryGap: [0, 1],
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: true },
    },
    series: [
      {
        name: "Votes",
        type: "bar",
        data: appVotes,
        color: "#59e691",
      },
    ],
  };
  return chartConfig;
};

const loadChartData = () => {
  if (state.isLoading !== true || state.apps.length > 0) return;
  try {
    asyncFetch(
      "https://storage.googleapis.com/databricks-near-query-runner/output/nearcon_apps/apps_qualified.json"
    )
      .then((res) => {
        const apps = JSON.parse(res.body).data.map((app_raw) => {
          const app = JSON.parse(app_raw);

          const appUrl = `${detailsUrl}${app.widget_name}`;
          app.votes = apps.num_votes;

          app.appUrl = appUrl;
          app.recentTag = app.lastest_tag;

          const uniqueTags = Array.from(new Set(app.tags));
          app.tags = uniqueTags;

          return { ...app, metadata };
        });
        State.update({
          apps,
          isLoading: false,
        });
      })
      .catch((error) => {
        State.update({
          isLoading: false,
        });
        console.error(error);
      });
  } catch (error) {
    console.error("Error on fetching data:", error);
  }
};

useEffect(() => {
  if (state.apps.length == 0) {
    loadChartData();
    return;
  }
  const chartConfig = createChartConfig(state.apps);
  State.update({
    chartConfig,
    isLoading: false,
  });
}, [state.apps]);

const GraphContainer = styled.div`
  display: flex;
  flex-direction: column;

  @media (min-width: 450px) {
    flex-direction: row;
  }
`;

const Graph = styled.div`
  display: flex;
  margin-top: -50px;
  margin-bottom: 20px;
  flex-direction: column;
  min-height: 100px;
  min-width: 300px;
  @media (min-width: 450px) {
    margin-left: 30px;
  }
`;

const Title = styled.h3`
  font: var(--text-l);
  font-weight: 700;
  color: var(--sand12);
  margin-bottom: 0;
`;

const Text = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 14px;
  color: #687076;
  padding-top: 10px;
  font-weight: 400;
  flex-shrink: 0;
  white-space: nowrap;
  text-align: center;
  overflow: hidden;

  i {
    font-size: 16px;
  }
`;

const Loader = () => {
  return (
    <div className="loader">
      <span
        className="spinner-grow spinner-grow-sm me-1"
        role="status"
        aria-hidden="true"
      />
      Loading ...
    </div>
  );
};

return (
  <>
    <Graph>
      {title && <Title>{title}</Title>}
      {state.isLoading && <Loader />}
      {state.NoDataAvalaible && (
        <Text> This category does not have data to show yet. </Text>
      )}
      {!state.isLoading && !state.NoDataAvalaible && (
        <Widget
          src="${REPL_ACCOUNT}/widget/Chart"
          props={{
            definition: state.chartConfig,
            width,
            height,
          }}
        />
      )}
    </Graph>
  </>
);
