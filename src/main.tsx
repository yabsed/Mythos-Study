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

const cgitPatch = `diff --git a/lib/librpcsec_gss/svc_rpcsec_gss.c b/lib/librpcsec_gss/svc_rpcsec_gss.c
index e9d39a813f86..73b92371e6d0 100644
--- a/lib/librpcsec_gss/svc_rpcsec_gss.c
+++ b/lib/librpcsec_gss/svc_rpcsec_gss.c
@@ -758,6 +758,14 @@ svc_rpc_gss_validate(struct svc_rpc_gss_client *client, struct rpc_msg *msg,

 	memset(rpchdr, 0, sizeof(rpchdr));

+	oa = &msg->rm_call.cb_cred;
+
+	if (oa->oa_length > sizeof(rpchdr) - 8 * BYTES_PER_XDR_UNIT) {
+		log_debug("auth length %d exceeds maximum", oa->oa_length);
+		client->cl_state = CLIENT_STALE;
+		return (FALSE);
+	}
+
 	/* Reconstruct RPC header for signing (from xdr_callmsg). */
 	buf = rpchdr;
 	IXDR_PUT_LONG(buf, msg->rm_xid);
@@ -766,7 +774,6 @@ svc_rpc_gss_validate(struct svc_rpc_gss_client *client, struct rpc_msg *msg,
 	IXDR_PUT_LONG(buf, msg->rm_call.cb_prog);
 	IXDR_PUT_LONG(buf, msg->rm_call.cb_vers);
 	IXDR_PUT_LONG(buf, msg->rm_call.cb_proc);
-	oa = &msg->rm_call.cb_cred;
 	IXDR_PUT_ENUM(buf, oa->oa_flavor);
 	IXDR_PUT_LONG(buf, oa->oa_length);
 	if (oa->oa_length) {
diff --git a/sys/rpc/rpcsec_gss/svc_rpcsec_gss.c b/sys/rpc/rpcsec_gss/svc_rpcsec_gss.c
index 35c904560836..528112d5642a 100644
--- a/sys/rpc/rpcsec_gss/svc_rpcsec_gss.c
+++ b/sys/rpc/rpcsec_gss/svc_rpcsec_gss.c
@@ -1170,6 +1170,15 @@ svc_rpc_gss_validate(struct svc_rpc_gss_client *client, struct rpc_msg *msg,

 	memset(rpchdr, 0, sizeof(rpchdr));

+	oa = &msg->rm_call.cb_cred;
+
+	if (oa->oa_length > sizeof(rpchdr) - 8 * BYTES_PER_XDR_UNIT) {
+		rpc_gss_log_debug("auth length %d exceeds maximum",
+		    oa->oa_length);
+		client->cl_state = CLIENT_STALE;
+		return (FALSE);
+	}
+
 	/* Reconstruct RPC header for signing (from xdr_callmsg). */
 	buf = rpchdr;
 	IXDR_PUT_LONG(buf, msg->rm_xid);
@@ -1178,7 +1187,6 @@ svc_rpc_gss_validate(struct svc_rpc_gss_client *client, struct rpc_msg *msg,
 	IXDR_PUT_LONG(buf, msg->rm_call.cb_prog);
 	IXDR_PUT_LONG(buf, msg->rm_call.cb_vers);
 	IXDR_PUT_LONG(buf, msg->rm_call.cb_proc);
-	oa = &msg->rm_call.cb_cred;
 	IXDR_PUT_ENUM(buf, oa->oa_flavor);
 	IXDR_PUT_LONG(buf, oa->oa_length);
 	if (oa->oa_length) {`;

const validatedFunctionSource = `static bool_t
svc_rpc_gss_validate(struct svc_rpc_gss_client *client, struct rpc_msg *msg,
	gss_qop_t *qop)
{
	struct opaque_auth	*oa;
	gss_buffer_desc		 rpcbuf, checksum;
	OM_uint32		 maj_stat, min_stat;
	gss_qop_t		 qop_state;
	int32_t			 rpchdr[128 / sizeof(int32_t)];
	int32_t			*buf;

	log_debug("in svc_rpc_gss_validate()");

	memset(rpchdr, 0, sizeof(rpchdr));

	oa = &msg->rm_call.cb_cred;

	if (oa->oa_length > sizeof(rpchdr) - 8 * BYTES_PER_XDR_UNIT) {
		log_debug("auth length %d exceeds maximum", oa->oa_length);
		client->cl_state = CLIENT_STALE;
		return (FALSE);
	}

	/* Reconstruct RPC header for signing (from xdr_callmsg). */
	buf = rpchdr;
	IXDR_PUT_LONG(buf, msg->rm_xid);
	IXDR_PUT_ENUM(buf, msg->rm_direction);
	IXDR_PUT_LONG(buf, msg->rm_call.cb_rpcvers);
	IXDR_PUT_LONG(buf, msg->rm_call.cb_prog);
	IXDR_PUT_LONG(buf, msg->rm_call.cb_vers);
	IXDR_PUT_LONG(buf, msg->rm_call.cb_proc);
	IXDR_PUT_ENUM(buf, oa->oa_flavor);
	IXDR_PUT_LONG(buf, oa->oa_length);
	if (oa->oa_length) {
		memcpy((caddr_t)buf, oa->oa_base, oa->oa_length);
		buf += RNDUP(oa->oa_length) / sizeof(int32_t);
	}
	rpcbuf.value = rpchdr;
	rpcbuf.length = (u_char *)buf - (u_char *)rpchdr;

	checksum.value = msg->rm_call.cb_verf.oa_base;
	checksum.length = msg->rm_call.cb_verf.oa_length;

	maj_stat = gss_verify_mic(&min_stat, client->cl_ctx, &rpcbuf, &checksum,
				  &qop_state);

	if (maj_stat != GSS_S_COMPLETE) {
		log_status("gss_verify_mic", client->cl_mech,
		    maj_stat, min_stat);
		client->cl_state = CLIENT_STALE;
		return (FALSE);
	}
	*qop = qop_state;
	return (TRUE);
}`;

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
        playScene={playScene}
      />

      <PatchReference />

      <AdvisoryTranslation />
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
        <p className="advisory-kicker">cgit src commit</p>
        <h2>수정 커밋과 코드 변경</h2>
      </header>

      <section className="patch-section">
        <h3>커밋 정보</h3>
        <dl className="patch-meta">
          <div>
            <dt>커밋</dt>
            <dd><code>1b00fdc1f3cd1311e4b52be253e0fecbca35941d</code></dd>
          </div>
          <div>
            <dt>작성자</dt>
            <dd>Mark Johnston &lt;markj@FreeBSD.org&gt;</dd>
          </div>
          <div>
            <dt>커미터</dt>
            <dd>Gordon Tetlow &lt;gordon@FreeBSD.org&gt;</dd>
          </div>
          <div>
            <dt>커밋 시각</dt>
            <dd>2026-03-26 01:25:05 +0000</dd>
          </div>
          <div>
            <dt>부모</dt>
            <dd><code>1fddb5435315ca44c96960b16bdda8338afd15a1</code></dd>
          </div>
          <div>
            <dt>보안</dt>
            <dd>FreeBSD-SA-26:08.rpcsec_gss, CVE-2026-4747</dd>
          </div>
        </dl>
        <p>
          <code>svc_rpc_gss_validate()</code>가 입력 메시지를 고정 크기 스택
          버퍼로 복사하기 전에 인증 데이터 길이를 검사하도록 바꾼 커밋입니다.
          <code>oa_length</code>가 버퍼에 들어갈 수 있는 최대 길이를 넘으면
          클라이언트 상태를 stale로 바꾸고 검증을 중단합니다.
        </p>
        <div className="source-line">
          <a href="https://cgit.freebsd.org/src/commit/?id=1b00fdc1f3cd1311e4b52be253e0fecbca35941d" target="_blank" rel="noreferrer">
            cgit 커밋 보기
          </a>
          <span>cherry-picked from <code>143293c14f8de00c6d3de88cd23fc224e7014206</code></span>
        </div>
      </section>

      <section className="patch-section">
        <h3>Diffstat</h3>
        <div className="table-wrap">
          <table className="advisory-table">
            <thead>
              <tr>
                <th>파일</th>
                <th>변경</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>lib/librpcsec_gss/svc_rpcsec_gss.c</code></td>
                <td>9 lines</td>
              </tr>
              <tr>
                <td><code>sys/rpc/rpcsec_gss/svc_rpcsec_gss.c</code></td>
                <td>10 lines</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>전체 변경량은 2개 파일, 17줄 추가, 2줄 삭제입니다.</p>
      </section>

      <section className="patch-section">
        <h3>패치 원문</h3>
        <pre className="code-block"><code>{cgitPatch}</code></pre>
      </section>

      <section className="patch-section">
        <h3>함수 원문</h3>
        <p>
          아래는 길이 검사가 들어간 사용자 공간
          <code>librpcsec_gss</code> 쪽 <code>svc_rpc_gss_validate()</code>
          함수 원문입니다.
        </p>
        <pre className="code-block source-code"><code>{validatedFunctionSource}</code></pre>
      </section>
    </article>
  );
}



function AdvisoryTranslation() {
  return (
    <article className="advisory">
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

      <p className="advisory-intro">
        FreeBSD 보안 권고의 각 필드, 보안 브랜치, 아래 섹션에 대한 일반 정보는{" "}
        <a href="https://security.FreeBSD.org/" target="_blank" rel="noreferrer">
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
                  <td>{row.branch}</td>
                  <td>{row.corrected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="advisory-section">
        <h3>I. 배경</h3>
        <p>
          GSS(Generic Security Services)는 애플리케이션이 NFC 서버와 같은
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
                  <td>{row.branch}</td>
                  <td><code>{row.hash}</code></td>
                  <td>{row.revision}</td>
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
          <a href="https://cgit.freebsd.org/src/commit/?id=NNNNNN" target="_blank" rel="noreferrer">
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
          <a href="https://www.cve.org/CVERecord?id=CVE-2026-4747" target="_blank" rel="noreferrer">
            CVE-2026-4747
          </a>
          <a href="https://security.FreeBSD.org/advisories/FreeBSD-SA-26:08.rpcsec_gss.asc" target="_blank" rel="noreferrer">
            FreeBSD-SA-26:08.rpcsec_gss 최신 권고문
          </a>
        </div>
      </section>
    </article>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
