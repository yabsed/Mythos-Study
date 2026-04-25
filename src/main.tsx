import React from "react";
import ReactDOM from "react-dom/client";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  LockKeyhole,
  Network,
  Play,
  RotateCcw,
  Server,
  ShieldCheck,
} from "lucide-react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/grayscale.css";
import "./styles.css";

hljs.registerLanguage("javascript", javascript);

type StoryId = "small" | "overflow" | "patched" | "closed";

type LabState = {
  packetBytes: number;
  doorOpen: boolean;
  patched: boolean;
};

const BUFFER_BYTES = 128;
const BLOCK_BYTES = 32;
const CAPACITY_BLOCKS = BUFFER_BYTES / BLOCK_BYTES;

const initialState: LabState = {
  packetBytes: 320,
  doorOpen: true,
  patched: false,
};

const sceneOrder: StoryId[] = ["small", "overflow", "patched", "closed"];
type CodeTone = "neutral" | "safe" | "danger" | "missing" | "muted";

const scenes: Record<
  StoryId,
  {
    label: string;
    icon: React.ReactNode;
    state: LabState;
  }
> = {
  small: {
    label: "작은 요청",
    icon: <CheckCircle2 size={18} />,
    state: {
      packetBytes: 96,
      doorOpen: true,
      patched: false,
    },
  },
  overflow: {
    label: "너무 큰 요청",
    icon: <AlertTriangle size={18} />,
    state: {
      packetBytes: 320,
      doorOpen: true,
      patched: false,
    },
  },
  patched: {
    label: "수리된 서버",
    icon: <ShieldCheck size={18} />,
    state: {
      packetBytes: 320,
      doorOpen: true,
      patched: true,
    },
  },
  closed: {
    label: "접근 차단",
    icon: <LockKeyhole size={18} />,
    state: {
      packetBytes: 320,
      doorOpen: false,
      patched: false,
    },
  },
};

function getStory(state: LabState) {
  const overflowBytes = Math.max(0, state.packetBytes - BUFFER_BYTES);
  const packetBlocks = Math.ceil(state.packetBytes / BLOCK_BYTES);
  const boxReceivesData = state.doorOpen && !state.patched;
  const overflowing = boxReceivesData && overflowBytes > 0;
  const tone = !state.doorOpen
    ? "closed"
    : state.patched
      ? "patched"
      : overflowing
        ? "overflow"
        : "small";

  return {
    overflowBytes,
    boxReceivesData,
    overflowing,
    tone,
    packetBlocks,
    overflowBlocks: boxReceivesData
      ? Math.max(0, packetBlocks - CAPACITY_BLOCKS)
      : 0,
    packetStop: !state.doorOpen ? "34%" : state.patched ? "62%" : "83%",
    blockCount: boxReceivesData ? packetBlocks : 0,
  };
}

function App() {
  const [state, setState] = React.useState<LabState>(initialState);
  const [sceneId, setSceneId] = React.useState<StoryId>("overflow");
  const [runId, setRunId] = React.useState(1);
  const [playingAll, setPlayingAll] = React.useState(false);
  const timersRef = React.useRef<number[]>([]);
  const story = getStory(state);

  React.useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const playScene = (nextScene: StoryId) => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setPlayingAll(false);
    setSceneId(nextScene);
    setState(scenes[nextScene].state);
    setRunId((current) => current + 1);
  };

  const playAll = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setPlayingAll(true);
    sceneOrder.forEach((nextScene, index) => {
      const timer = window.setTimeout(() => {
        setSceneId(nextScene);
        setState(scenes[nextScene].state);
        setRunId((current) => current + 1);
      }, index * 3600);
      timersRef.current.push(timer);
    });
    timersRef.current.push(
      window.setTimeout(() => setPlayingAll(false), sceneOrder.length * 3600),
    );
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="eyebrow">CVE-2026-4747</div>
        <h1>RPCSEC_GSS 오버플로우</h1>
      </header>

      <section className="support-row">
        <CodeLens state={state} story={story} />
      </section>

      <StoryTheater
        sceneId={sceneId}
        runId={runId}
        state={state}
        story={story}
        playingAll={playingAll}
        playScene={playScene}
        playAll={playAll}
      />

      <Explanation />
    </main>
  );
}

function StoryTheater({
  sceneId,
  runId,
  state,
  story,
  playingAll,
  playScene,
  playAll,
}: {
  sceneId: StoryId;
  runId: number;
  state: LabState;
  story: ReturnType<typeof getStory>;
  playingAll: boolean;
  playScene: (nextScene: StoryId) => void;
  playAll: () => void;
}) {
  const visualStyle = {
    "--story-stop": story.packetStop,
  } as React.CSSProperties;

  return (
    <section className={`story-card story-${story.tone}`}>
      <div className="story-topline">
        <div className="scene-tabs">
          {sceneOrder.map((id) => (
            <button
              className={id === sceneId ? "is-selected" : ""}
              type="button"
              key={id}
              onClick={() => playScene(id)}
            >
              {scenes[id].icon}
              <span>{scenes[id].label}</span>
            </button>
          ))}
        </div>
        <div className="story-actions">
          <button
            className="primary-button"
            type="button"
            onClick={playAll}
            disabled={playingAll}
          >
            <Play size={16} />
            {playingAll ? "재생 중" : "전체 보기"}
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => playScene(sceneId)}
            aria-label="다시 보기"
            title="다시 보기"
          >
            <RotateCcw size={17} />
          </button>
        </div>
      </div>

      <div className="story-stage" key={runId} style={visualStyle}>
        <div className="actor actor-left">
          <div className="actor-box">
            <Network size={30} />
          </div>
          <strong>보내는 쪽</strong>
        </div>

        <div className={`packet packet-${story.tone}`}>
          <div className="packet-fold" />
          <strong>{state.packetBytes}</strong>
        </div>

        <div className="actor actor-right">
          <div className="actor-box server-box">
            <Server size={32} />
            {state.patched ? <ShieldCheck className="shield" size={54} /> : null}
          </div>
          <strong>받는 쪽</strong>
        </div>

        <div className="memory-area">
          <div className={`memory-box ${story.overflowing ? "is-overflowing" : ""}`}>
            <span className="box-label">스택 버퍼</span>
            <div className="empty-slots">
              {Array.from({ length: CAPACITY_BLOCKS }, (_, index) => (
                <i key={index} />
              ))}
            </div>
            {story.boxReceivesData ? (
              <div className="data-blocks">
                {Array.from(
                  { length: Math.min(story.blockCount, CAPACITY_BLOCKS) },
                  (_, index) => (
                    <i
                      style={{ animationDelay: `${1320 + index * 90}ms` }}
                      key={index}
                    />
                  ),
                )}
              </div>
            ) : null}
            {state.patched ? (
              <div className="blocked-data">
                {Array.from({ length: story.packetBlocks }, (_, index) => (
                  <i
                    style={{ animationDelay: `${1260 + index * 75}ms` }}
                    key={index}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <div className="danger-zone">
            <span>옆 메모리</span>
            {story.overflowBlocks > 0 ? (
              <div className="overflow-data">
                {Array.from({ length: story.overflowBlocks }, (_, index) => (
                  <i
                    style={{ animationDelay: `${1680 + index * 80}ms` }}
                    key={index}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="result-badge">
          {!state.doorOpen ? (
            <LockKeyhole size={34} />
          ) : state.patched ? (
            <ShieldCheck size={38} />
          ) : story.overflowing ? (
            <AlertTriangle size={38} />
          ) : (
            <CheckCircle2 size={38} />
          )}
        </div>
      </div>
    </section>
  );
}

function CodeLens({
  state,
  story,
}: {
  state: LabState;
  story: ReturnType<typeof getStory>;
}) {
  const rows: { line: string; tone: CodeTone }[] = [
    {
      line: "if (!rpcsecGssReachable) return;",
      tone: state.doorOpen ? "neutral" : "safe",
    },
    {
      line: `const box = stackBuffer(${BUFFER_BYTES}); // 4 blocks`,
      tone: state.doorOpen ? "neutral" : "muted",
    },
    {
      line: `const incoming = requestPart(${state.packetBytes}); // ${story.packetBlocks} blocks`,
      tone: state.doorOpen ? "neutral" : "muted",
    },
    {
      line: "if (incoming > box.size) return;",
      tone: !state.doorOpen ? "muted" : state.patched ? "safe" : "missing",
    },
    {
      line: "copy(box, incoming);",
      tone: !state.doorOpen ? "muted" : story.overflowing ? "danger" : "safe",
    },
  ];

  return (
    <section className="code-lens">
      <div className="code-title">
        <Code2 size={20} />
        <h2>의사코드</h2>
      </div>
      <div className="pseudo-code">
        {rows.map((row, index) => (
          <div className={`code-row tone-${row.tone}`} key={row.line}>
            <span className="code-line-number">{index + 1}</span>
            <HighlightedCode line={row.line} />
          </div>
        ))}
      </div>
    </section>
  );
}

function HighlightedCode({ line }: { line: string }) {
  const highlighted = hljs.highlight(line, { language: "javascript" }).value;

  return (
    <code
      className="hljs"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

function Explanation() {
  return (
    <section className="explanation">
      <p>
        FreeBSD의 RPCSEC_GSS 검증 루틴은 패킷 서명을 확인하면서 패킷 일부를
        고정 크기 스택 버퍼로 복사합니다. 취약한 버전에서는 복사 전에 길이를
        충분히 확인하지 않아, 큰 RPCSEC_GSS 데이터 패킷이 버퍼 밖의 옆 메모리로
        넘칠 수 있습니다.
      </p>
      <p>
        그림에서 봉투는 하나의 논리적 RPCSEC_GSS 데이터 패킷, 스택 버퍼는
        128바이트 상자, 블록 하나는 32바이트입니다. 그래서 320은 10개 블록이고,
        상자 안에는 4개만 들어갑니다.
      </p>
      <div className="source-line">
        출처:{" "}
        <a href="https://nvd.nist.gov/vuln/detail/CVE-2026-4747" target="_blank" rel="noreferrer">
          NVD
        </a>
        <a href="https://www.freebsd.org/security/advisories/FreeBSD-SA-26:08.rpcsec_gss.asc" target="_blank" rel="noreferrer">
          FreeBSD Advisory
        </a>
      </div>
    </section>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
