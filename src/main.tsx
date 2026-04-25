import React from "react";
import ReactDOM from "react-dom/client";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Code2,
  Cpu,
  Gauge,
  GitBranch,
  Layers3,
  LockKeyhole,
  MousePointerClick,
  Network,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  ShieldX,
  SlidersHorizontal,
  StepForward,
  TestTube2,
} from "lucide-react";
import "./styles.css";

type Surface = "kernel-nfs" | "userspace-rpc" | "off";
type Branch = "15.0" | "14.4" | "14.3" | "13.5" | "custom";

type LabState = {
  branch: Branch;
  patchLevel: number;
  surface: Surface;
  packetBytes: number;
  kgssapiLoaded: boolean;
  rpcServerExposed: boolean;
  lowPrivilegeTicket: boolean;
  lengthCheckPatched: boolean;
};

type Impact = "rce" | "overflow" | "fits" | "patched" | "module-off" | "not-exposed";
type FlowStepId = "request" | "gss" | "module" | "guard" | "copy" | "impact";

type PatchRule = {
  label: string;
  fixedPatch: number;
  corrected: string;
};

const BUFFER_BYTES = 128;
const HEADER_BYTES = 32;
const MAX_XDR_CREDENTIAL = 400;

const patchRules: Record<Exclude<Branch, "custom">, PatchRule> = {
  "15.0": {
    label: "15.0-RELEASE",
    fixedPatch: 5,
    corrected: "15.0-RELEASE-p5",
  },
  "14.4": {
    label: "14.4-RELEASE",
    fixedPatch: 1,
    corrected: "14.4-RELEASE-p1",
  },
  "14.3": {
    label: "14.3-RELEASE",
    fixedPatch: 10,
    corrected: "14.3-RELEASE-p10",
  },
  "13.5": {
    label: "13.5-RELEASE",
    fixedPatch: 11,
    corrected: "13.5-RELEASE-p11",
  },
};

const initialState: LabState = {
  branch: "14.4",
  patchLevel: 0,
  surface: "kernel-nfs",
  packetBytes: 256,
  kgssapiLoaded: true,
  rpcServerExposed: true,
  lowPrivilegeTicket: true,
  lengthCheckPatched: false,
};

const lessonSteps: Array<{
  title: string;
  body: string;
  observation: string;
  state: LabState;
  focus: FlowStepId;
}> = [
  {
    title: "1. 먼저 진입점이 열려야 합니다",
    body: "RPC 서버가 외부 요청을 받지 않으면 패킷은 취약 루틴까지 도착하지 못합니다.",
    observation: "서버 노출 스위치를 끄면 뒤쪽 단계가 모두 흐려집니다.",
    state: {
      ...initialState,
      rpcServerExposed: false,
      packetBytes: 256,
    },
    focus: "request",
  },
  {
    title: "2. RPCSEC_GSS 경로로 들어옵니다",
    body: "커널 NFS의 경우 kgssapi.ko가 로드되어 있어야 검증 코드가 실행됩니다.",
    observation: "모듈을 내리면 같은 패킷 크기라도 커널 경로는 닫힙니다.",
    state: {
      ...initialState,
      kgssapiLoaded: true,
      packetBytes: 96,
    },
    focus: "module",
  },
  {
    title: "3. 작은 입력은 버퍼 안에 머뭅니다",
    body: "128바이트 스택 버퍼보다 작은 복사는 위험 경계에 닿지 않습니다.",
    observation: "막대가 검은 경계선 왼쪽에 있으면 오버플로우가 0바이트입니다.",
    state: {
      ...initialState,
      packetBytes: 112,
    },
    focus: "copy",
  },
  {
    title: "4. 경계를 넘는 순간이 핵심입니다",
    body: "취약 빌드에서는 길이 확인 없이 복사되어, 요청 크기가 128바이트를 넘으면 스택 밖으로 쓰기가 이어집니다.",
    observation: "빨간 빗금 영역이 실제 취약 조건을 직관적으로 보여줍니다.",
    state: {
      ...initialState,
      packetBytes: 288,
    },
    focus: "copy",
  },
  {
    title: "5. 패치는 복사 전에 멈춥니다",
    body: "수정된 릴리스나 길이 검사 패치가 있으면 같은 큰 입력도 경계 밖으로 복사되지 않는 것으로 모델링됩니다.",
    observation: "위험 점수가 떨어지고 의사코드에서 guard 라인이 강조됩니다.",
    state: {
      ...initialState,
      patchLevel: 1,
      packetBytes: 288,
      lengthCheckPatched: true,
    },
    focus: "guard",
  },
];

const scenarioPresets: Array<{
  title: string;
  detail: string;
  state: LabState;
  focus: FlowStepId;
}> = [
  {
    title: "안전한 작은 패킷",
    detail: "복사 요청이 버퍼 안에서 끝납니다.",
    state: {
      ...initialState,
      packetBytes: 96,
    },
    focus: "copy",
  },
  {
    title: "취약 조건 재현",
    detail: "노출, 모듈, 큰 입력이 동시에 켜진 상태입니다.",
    state: {
      ...initialState,
      packetBytes: 320,
    },
    focus: "impact",
  },
  {
    title: "패치 적용 후",
    detail: "같은 큰 입력을 길이 검사에서 거절합니다.",
    state: {
      ...initialState,
      patchLevel: 1,
      packetBytes: 320,
      lengthCheckPatched: true,
    },
    focus: "guard",
  },
  {
    title: "모듈 미로드",
    detail: "kgssapi.ko가 없으면 커널 NFS 경로가 닫힙니다.",
    state: {
      ...initialState,
      packetBytes: 320,
      kgssapiLoaded: false,
    },
    focus: "module",
  },
];

function isBranchPatched(state: LabState) {
  if (state.lengthCheckPatched) {
    return true;
  }

  if (state.branch === "custom") {
    return false;
  }

  return state.patchLevel >= patchRules[state.branch].fixedPatch;
}

function getSimulation(state: LabState) {
  const patched = isBranchPatched(state);
  const copyBytes = Math.min(state.packetBytes, MAX_XDR_CREDENTIAL);
  const overflowBytes = Math.max(0, copyBytes - BUFFER_BYTES);
  const freeStackBytes = Math.max(0, BUFFER_BYTES - HEADER_BYTES);
  const surfaceEnabled = state.surface !== "off";
  const moduleGate =
    state.surface === "kernel-nfs" ? state.kgssapiLoaded : surfaceEnabled;
  const exposed = surfaceEnabled && moduleGate && state.rpcServerExposed;
  const overflowWouldOccur = overflowBytes > 0;
  const canTrigger = exposed && overflowWouldOccur && !patched;
  const rcePossible =
    canTrigger &&
    (state.surface === "userspace-rpc" || state.lowPrivilegeTicket);

  const impact: Impact =
    !surfaceEnabled || !state.rpcServerExposed
      ? "not-exposed"
      : patched
        ? "patched"
        : !moduleGate
          ? "module-off"
          : !overflowWouldOccur
            ? "fits"
            : rcePossible
              ? "rce"
              : "overflow";

  const score = Math.min(
    100,
    Math.round(
      (patched ? 0 : 24) +
        (state.rpcServerExposed ? 18 : 0) +
        (moduleGate ? 16 : 0) +
        (overflowWouldOccur ? 22 : 0) +
        (state.lowPrivilegeTicket ? 10 : 0) +
        Math.min(10, overflowBytes / 20),
    ),
  );

  return {
    patched,
    copyBytes,
    freeStackBytes,
    overflowBytes,
    exposed,
    canTrigger,
    rcePossible,
    impact,
    score,
  };
}

function getFlowSteps(
  state: LabState,
  simulation: ReturnType<typeof getSimulation>,
) {
  return [
    {
      id: "request",
      label: "RPC 요청",
      active: state.rpcServerExposed,
      danger: false,
      title: "원격 진입점",
      detail: state.rpcServerExposed
        ? "RPC 서버가 요청을 받는 상태라 다음 단계로 진행됩니다."
        : "서버가 노출되지 않아 패킷이 취약 루틴까지 도착하지 않습니다.",
    },
    {
      id: "gss",
      label: "RPCSEC_GSS",
      active: state.surface !== "off",
      danger: false,
      title: "보안 계층 선택",
      detail:
        state.surface === "off"
          ? "RPCSEC_GSS가 꺼져 있어 이 CVE의 검증 루틴을 타지 않습니다."
          : "RPCSEC_GSS 검증 흐름으로 들어가 패킷 서명과 credential 본문을 처리합니다.",
    },
    {
      id: "module",
      label: "kgssapi/librpcgss",
      active: state.surface === "userspace-rpc" || state.kgssapiLoaded,
      danger: false,
      title: "취약 구현체",
      detail:
        state.surface === "kernel-nfs"
          ? state.kgssapiLoaded
            ? "커널 모듈 kgssapi.ko가 로드되어 NFS 서버 경로가 열려 있습니다."
            : "FreeBSD 권고 기준으로 kgssapi.ko가 로드되지 않은 커널은 이 경로에 취약하지 않습니다."
          : "유저랜드 RPC 서버가 librpcgss_sec를 사용하는 경우로 모델링합니다.",
    },
    {
      id: "guard",
      label: "길이 검사",
      active: !simulation.patched,
      danger: !simulation.patched,
      title: "경계 검사",
      detail: simulation.patched
        ? "패치된 경로에서는 복사 전에 길이를 확인해 oversized 입력을 차단합니다."
        : "취약 경로에서는 복사 전에 충분한 길이 확인이 없는 것으로 모델링됩니다.",
    },
    {
      id: "copy",
      label: "스택 복사",
      active: simulation.exposed,
      danger: simulation.overflowBytes > 0 && !simulation.patched,
      title: "고정 크기 스택 버퍼",
      detail:
        simulation.overflowBytes > 0
          ? `${simulation.copyBytes}바이트 복사 요청이 128바이트 버퍼를 ${simulation.overflowBytes}바이트 초과합니다.`
          : `${simulation.copyBytes}바이트 복사 요청은 128바이트 버퍼 안에 머뭅니다.`,
    },
    {
      id: "impact",
      label: "영향",
      active: simulation.canTrigger,
      danger: simulation.rcePossible,
      title: "결과 판정",
      detail: simulation.rcePossible
        ? "노출된 취약 경로와 큰 입력이 겹쳐 원격 코드 실행 위험으로 판정됩니다."
        : "현재 조합에서는 취약 영향까지 이어지는 조건이 모두 맞지 않습니다.",
    },
  ] satisfies Array<{
    id: FlowStepId;
    label: string;
    active: boolean;
    danger: boolean;
    title: string;
    detail: string;
  }>;
}

function impactCopy(impact: Impact) {
  const map = {
    rce: {
      title: "커널/프로세스 코드 실행 경로 열림",
      detail:
        "취약 빌드에서 RPCSEC_GSS 검증 경로가 노출되고, 복사 길이가 스택 버퍼를 넘어섭니다.",
      tone: "danger",
    },
    overflow: {
      title: "스택 오버플로우 트리거",
      detail:
        "버퍼 경계 밖으로 쓰기가 발생하지만, 현재 입력에서는 코드 실행 조건이 모두 충족되지는 않았습니다.",
      tone: "warning",
    },
    fits: {
      title: "버퍼 안에 수용",
      detail: "선택한 패킷 크기는 128바이트 스택 버퍼를 넘지 않습니다.",
      tone: "safe",
    },
    patched: {
      title: "수정된 경로",
      detail:
        "선택한 릴리스/패치 수준에서는 길이 검사가 적용된 상태로 모델링됩니다.",
      tone: "safe",
    },
    "module-off": {
      title: "kgssapi.ko 미로드",
      detail:
        "FreeBSD 권고 기준으로 커널 모듈이 로드되지 않은 커널은 이 경로에 취약하지 않습니다.",
      tone: "safe",
    },
    "not-exposed": {
      title: "원격 진입점 닫힘",
      detail: "RPCSEC_GSS 트래픽을 받는 RPC 서버가 노출되지 않았습니다.",
      tone: "safe",
    },
  } as const;

  return map[impact];
}

function App() {
  const [state, setState] = React.useState<LabState>(initialState);
  const [lessonIndex, setLessonIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [selectedFlow, setSelectedFlow] = React.useState<FlowStepId>("copy");
  const simulation = getSimulation(state);
  const copy = impactCopy(simulation.impact);

  React.useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setLessonIndex((current) => {
        const next = (current + 1) % lessonSteps.length;
        setState(lessonSteps[next].state);
        setSelectedFlow(lessonSteps[next].focus);
        return next;
      });
    }, 2400);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const update = <Key extends keyof LabState>(
    key: Key,
    value: LabState[Key],
  ) => {
    setIsPlaying(false);
    setState((current) => ({ ...current, [key]: value }));
  };

  const applyLesson = (index: number) => {
    const next = lessonSteps[index];
    setIsPlaying(false);
    setLessonIndex(index);
    setState(next.state);
    setSelectedFlow(next.focus);
  };

  const applyScenario = (index: number) => {
    const next = scenarioPresets[index];
    setIsPlaying(false);
    setState(next.state);
    setSelectedFlow(next.focus);
  };

  return (
    <main className="app-shell">
      <section className="hero-band">
        <div className="hero-copy">
          <div className="eyebrow">
            <ShieldX size={16} />
            CVE-2026-4747
          </div>
          <h1>RPCSEC_GSS 스택 오버플로우 시각 실험실</h1>
          <p>
            FreeBSD NFS/RPCSEC_GSS 패킷 검증 흐름을 안전한 브라우저
            시뮬레이션으로 재현합니다. 실제 네트워크 패킷이나 익스플로잇은
            생성하지 않습니다.
          </p>
        </div>
        <div className="hero-meter" aria-label="현재 위험 점수">
          <Gauge size={18} />
          <strong>{simulation.score}</strong>
          <span>/ 100</span>
        </div>
      </section>

      <section className="summary-strip" aria-label="CVE 요약">
        <InfoPill icon={<AlertTriangle size={18} />} label="CWE-121" value="Stack-based buffer overflow" />
        <InfoPill icon={<Network size={18} />} label="CVSS 3.1" value="8.8 High, AV:N/AC:L/PR:L/UI:N" />
        <InfoPill icon={<GitBranch size={18} />} label="공개/수정" value="2026-03-26 공개, 2026-04-20 NVD 수정" />
      </section>

      <ScenarioRail applyScenario={applyScenario} />

      <section className="workspace">
        <ControlPanel
          state={state}
          update={update}
          reset={() => {
            setIsPlaying(false);
            setState(initialState);
            setSelectedFlow("copy");
          }}
        />
        <section className="visual-stage">
          <GuidedTour
            lessonIndex={lessonIndex}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            applyLesson={applyLesson}
          />
          <OutcomeBanner copy={copy} />
          <StackVisualizer state={state} simulation={simulation} />
          <FlowVisualizer
            state={state}
            simulation={simulation}
            selectedFlow={selectedFlow}
            setSelectedFlow={setSelectedFlow}
          />
          <CodeLens state={state} simulation={simulation} />
        </section>
      </section>

      <section className="details-grid">
        <FactBlock
          icon={<Cpu size={20} />}
          title="취약 루틴"
          lines={[
            "RPCSEC_GSS 데이터 패킷의 서명을 확인하는 검증 루틴",
            "패킷 일부를 고정 크기 스택 버퍼로 복사",
            "복사 전에 충분한 길이 검사를 하지 않는 경로",
          ]}
        />
        <FactBlock
          icon={<LockKeyhole size={20} />}
          title="도달 조건"
          lines={[
            "커널: kgssapi.ko가 로드되고 NFS 서버가 RPCSEC_GSS 트래픽을 수신",
            "유저랜드: librpcgss_sec가 로드된 RPC 서버",
            "권고문은 kgssapi.ko 미로드 커널은 취약하지 않다고 명시",
          ]}
        />
        <FactBlock
          icon={<ShieldCheck size={20} />}
          title="수정 기준"
          lines={[
            "15.0-RELEASE-p5 이상",
            "14.4-RELEASE-p1 이상, 14.3-RELEASE-p10 이상",
            "13.5-RELEASE-p11 이상",
          ]}
        />
      </section>

      <section className="references">
        <div>
          <BookOpen size={18} />
          <span>출처</span>
        </div>
        <a href="https://nvd.nist.gov/vuln/detail/CVE-2026-4747" target="_blank" rel="noreferrer">
          NVD CVE-2026-4747
        </a>
        <a href="https://www.freebsd.org/security/advisories/FreeBSD-SA-26:08.rpcsec_gss.asc" target="_blank" rel="noreferrer">
          FreeBSD-SA-26:08.rpcsec_gss
        </a>
      </section>
    </main>
  );
}

type ControlPanelProps = {
  state: LabState;
  update: <Key extends keyof LabState>(key: Key, value: LabState[Key]) => void;
  reset: () => void;
};

function ControlPanel({ state, update, reset }: ControlPanelProps) {
  const selectedRule = state.branch === "custom" ? null : patchRules[state.branch];

  return (
    <aside className="control-panel">
      <div className="panel-title">
        <SlidersHorizontal size={19} />
        <h2>테스트 입력</h2>
      </div>

      <label className="field">
        <span>FreeBSD 릴리스</span>
        <select
          value={state.branch}
          onChange={(event) => update("branch", event.target.value as Branch)}
        >
          <option value="15.0">15.0-RELEASE</option>
          <option value="14.4">14.4-RELEASE</option>
          <option value="14.3">14.3-RELEASE</option>
          <option value="13.5">13.5-RELEASE</option>
          <option value="custom">Custom vulnerable build</option>
        </select>
      </label>

      <label className="field">
        <span>
          패치 레벨
          {selectedRule ? <em>수정: {selectedRule.corrected}</em> : null}
        </span>
        <input
          type="range"
          min="0"
          max="12"
          value={state.patchLevel}
          onChange={(event) => update("patchLevel", Number(event.target.value))}
        />
        <output>p{state.patchLevel}</output>
      </label>

      <label className="field">
        <span>RPCSEC_GSS 표면</span>
        <select
          value={state.surface}
          onChange={(event) => update("surface", event.target.value as Surface)}
        >
          <option value="kernel-nfs">Kernel NFS + kgssapi.ko</option>
          <option value="userspace-rpc">Userspace RPC + librpcgss_sec</option>
          <option value="off">RPCSEC_GSS off</option>
        </select>
      </label>

      <label className="field">
        <span>검증 루틴으로 들어오는 바이트</span>
        <input
          type="range"
          min="32"
          max={MAX_XDR_CREDENTIAL}
          value={state.packetBytes}
          onChange={(event) => update("packetBytes", Number(event.target.value))}
        />
        <output>{state.packetBytes} bytes</output>
      </label>

      <div className="toggle-list">
        <Toggle
          label="kgssapi.ko 로드"
          checked={state.kgssapiLoaded}
          disabled={state.surface !== "kernel-nfs"}
          onChange={(checked) => update("kgssapiLoaded", checked)}
        />
        <Toggle
          label="RPC 서버 노출"
          checked={state.rpcServerExposed}
          onChange={(checked) => update("rpcServerExposed", checked)}
        />
        <Toggle
          label="낮은 권한 티켓/계정 있음"
          checked={state.lowPrivilegeTicket}
          onChange={(checked) => update("lowPrivilegeTicket", checked)}
        />
        <Toggle
          label="길이 검사 패치 적용"
          checked={state.lengthCheckPatched}
          onChange={(checked) => update("lengthCheckPatched", checked)}
        />
      </div>

      <button className="reset-button" type="button" onClick={reset}>
        <RotateCcw size={16} />
        초기값
      </button>
    </aside>
  );
}

function ScenarioRail({
  applyScenario,
}: {
  applyScenario: (index: number) => void;
}) {
  return (
    <section className="scenario-rail" aria-label="빠른 실험">
      <div className="scenario-title">
        <MousePointerClick size={18} />
        <h2>빠른 실험</h2>
      </div>
      <div className="scenario-buttons">
        {scenarioPresets.map((scenario, index) => (
          <button
            className="scenario-button"
            type="button"
            key={scenario.title}
            onClick={() => applyScenario(index)}
          >
            <strong>{scenario.title}</strong>
            <span>{scenario.detail}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function GuidedTour({
  lessonIndex,
  isPlaying,
  setIsPlaying,
  applyLesson,
}: {
  lessonIndex: number;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  applyLesson: (index: number) => void;
}) {
  const lesson = lessonSteps[lessonIndex];
  const nextIndex = (lessonIndex + 1) % lessonSteps.length;

  return (
    <section className="guided-tour" aria-label="단계별 설명">
      <div className="tour-header">
        <div>
          <span>워크스루</span>
          <h2>{lesson.title}</h2>
        </div>
        <div className="tour-actions">
          <button
            className="icon-button"
            type="button"
            onClick={() => setIsPlaying((current) => !current)}
            aria-label={isPlaying ? "재생 중지" : "재생"}
            title={isPlaying ? "재생 중지" : "재생"}
          >
            {isPlaying ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => applyLesson(nextIndex)}
            aria-label="다음 단계"
            title="다음 단계"
          >
            <StepForward size={17} />
          </button>
        </div>
      </div>
      <p>{lesson.body}</p>
      <div className="tour-observation">
        <span>관찰</span>
        <strong>{lesson.observation}</strong>
      </div>
      <div className="tour-dots" aria-label="워크스루 단계">
        {lessonSteps.map((step, index) => (
          <button
            key={step.title}
            type="button"
            className={index === lessonIndex ? "is-selected" : ""}
            onClick={() => applyLesson(index)}
            aria-label={step.title}
          />
        ))}
      </div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`toggle ${disabled ? "is-disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span aria-hidden="true" />
      {label}
    </label>
  );
}

function OutcomeBanner({
  copy,
}: {
  copy: ReturnType<typeof impactCopy>;
}) {
  return (
    <div className={`outcome outcome-${copy.tone}`}>
      {copy.tone === "safe" ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
      <div>
        <h2>{copy.title}</h2>
        <p>{copy.detail}</p>
      </div>
    </div>
  );
}

function StackVisualizer({
  state,
  simulation,
}: {
  state: LabState;
  simulation: ReturnType<typeof getSimulation>;
}) {
  const headerWidth = (HEADER_BYTES / MAX_XDR_CREDENTIAL) * 100;
  const bufferWidth = (BUFFER_BYTES / MAX_XDR_CREDENTIAL) * 100;
  const copyWidth = (simulation.copyBytes / MAX_XDR_CREDENTIAL) * 100;
  const overflowWidth = (simulation.overflowBytes / MAX_XDR_CREDENTIAL) * 100;

  return (
    <div className="stack-surface">
      <div className="section-heading">
        <Layers3 size={19} />
        <h2>스택 버퍼 압력</h2>
      </div>
      <div className="stack-diagram" aria-label="스택 버퍼 시각화">
        <div className="scale">
          <span>0</span>
          <span>128</span>
          <span>400 bytes</span>
        </div>
        <div className="track">
          <div className="header-zone" style={{ width: `${headerWidth}%` }} />
          <div className="buffer-zone" style={{ width: `${bufferWidth}%` }} />
          <div className="copy-zone" style={{ width: `${copyWidth}%` }} />
          {simulation.overflowBytes > 0 ? (
            <div
              className="overflow-zone"
              style={{
                left: `${bufferWidth}%`,
                width: `${overflowWidth}%`,
              }}
            />
          ) : null}
        </div>
        <div className="legend">
          <span><i className="legend-header" /> RPC/GSS header {HEADER_BYTES}B</span>
          <span><i className="legend-buffer" /> stack buffer {BUFFER_BYTES}B</span>
          <span><i className="legend-copy" /> copy request {state.packetBytes}B</span>
          <span><i className="legend-overflow" /> overflow {simulation.overflowBytes}B</span>
        </div>
      </div>
      <div className="metric-row">
        <Metric label="여유 영역" value={`${simulation.freeStackBytes}B`} />
        <Metric label="복사 요청" value={`${simulation.copyBytes}B`} />
        <Metric label="경계 초과" value={`${simulation.overflowBytes}B`} />
      </div>
    </div>
  );
}

function FlowVisualizer({
  state,
  simulation,
  selectedFlow,
  setSelectedFlow,
}: {
  state: LabState;
  simulation: ReturnType<typeof getSimulation>;
  selectedFlow: FlowStepId;
  setSelectedFlow: React.Dispatch<React.SetStateAction<FlowStepId>>;
}) {
  const steps = getFlowSteps(state, simulation);
  const selected = steps.find((step) => step.id === selectedFlow) ?? steps[0];

  return (
    <div className="flow-surface">
      <div className="section-heading">
        <TestTube2 size={19} />
        <h2>검증 경로</h2>
      </div>
      <div className="flow-line">
        {steps.map((step) => (
          <button
            key={step.label}
            type="button"
            onClick={() => setSelectedFlow(step.id)}
            className={`flow-node ${step.active ? "is-active" : ""} ${
                step.danger ? "is-danger" : ""
              } ${selected.id === step.id ? "is-selected" : ""}`}
          >
            {step.label}
          </button>
        ))}
      </div>
      <div className="flow-explain">
        <span>{selected.title}</span>
        <strong>{selected.detail}</strong>
      </div>
    </div>
  );
}

function CodeLens({
  state,
  simulation,
}: {
  state: LabState;
  simulation: ReturnType<typeof getSimulation>;
}) {
  const rows = [
    {
      no: 1,
      text: "int32_t rpchdr[32];        /* 128-byte stack buffer */",
      tone: "neutral",
    },
    {
      no: 2,
      text: `needed = credential_body_len; /* ${simulation.copyBytes} bytes now */`,
      tone: "neutral",
    },
    {
      no: 3,
      text: "if (needed > sizeof(rpchdr)) return reject;",
      tone: simulation.patched ? "safe" : "missing",
    },
    {
      no: 4,
      text: "memcpy(rpchdr, credential_body, needed);",
      tone:
        simulation.overflowBytes > 0 && !simulation.patched
          ? "danger"
          : "safe",
    },
  ];

  const branchLabel =
    state.branch === "custom" ? "custom build" : patchRules[state.branch].label;

  return (
    <section className="code-lens">
      <div className="section-heading">
        <Code2 size={19} />
        <h2>패치 전후 의사코드</h2>
      </div>
      <div className="code-summary">
        <span>{branchLabel}</span>
        <strong>
          {simulation.patched
            ? "guard가 복사를 막는 상태"
            : "guard 없이 복사까지 진행되는 상태"}
        </strong>
      </div>
      <div className="pseudo-code" aria-label="의사코드">
        {rows.map((row) => (
          <div className={`code-row tone-${row.tone}`} key={row.no}>
            <span>{row.no}</span>
            <code>{row.text}</code>
          </div>
        ))}
      </div>
    </section>
  );
}

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="info-pill">
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FactBlock({
  icon,
  title,
  lines,
}: {
  icon: React.ReactNode;
  title: string;
  lines: string[];
}) {
  return (
    <article className="fact-block">
      <div className="fact-title">
        {icon}
        <h2>{title}</h2>
      </div>
      <ul>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </article>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
