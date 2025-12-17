import { useEffect, useMemo, useState } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const BACKEND_URL = "https://cortex-backend-478973527810.europe-west1.run.app";

async function getFreshIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  return await user.getIdToken(true); // force refresh
}

type SortBy = "date" | "size";
type Order = "asc" | "desc";
type FileType = "" | "txt" | "json" | "pdf";

export default function App() {
  const [token, setToken] = useState<string>("");
  const [myUid, setMyUid] = useState<string>("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  // Query controls
  const [q, setQ] = useState("");
  const [fileType, setFileType] = useState<FileType>("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [order, setOrder] = useState<Order>("desc");

  const cleanName = (f: any) =>
    typeof f?.filename === "string" && f.filename.includes("_")
      ? f.filename.split("_").slice(1).join("_")
      : f?.filename ?? "";

  const fetchFiles = async (t: string) => {
    setLoadingFiles(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (fileType) params.set("file_type", fileType);
      params.set("sort_by", sortBy);
      params.set("order", order);

      const url = `${BACKEND_URL}/files?${params.toString()}`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${t}` },
      });

      const data = await r.json();
      if (!r.ok) {
        setErr(JSON.stringify(data, null, 2));
        setFiles([]);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!data.admin);
      setFiles(data.files ?? []);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setToken("");
        setMyUid("");
        setIsAdmin(false);
        setFiles([]);
        return;
      }

      const t = await user.getIdToken();
      setToken(t);
      setMyUid(user.uid);
      await fetchFiles(t);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto refresh when query controls change
  useEffect(() => {
    if (!token) return;
    fetchFiles(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, fileType, sortBy, order, token]);

  const login = async () => {
    setErr("");
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
    setToken("");
    setMyUid("");
    setIsAdmin(false);
    setFiles([]);
    setMe(null);
    setErr("");
  };

  const callMe = async () => {
    setErr("");
    setMe(null);
    try {
      const freshToken = await getFreshIdToken();

      const r = await fetch(`${BACKEND_URL}/me`, {
        headers: { Authorization: `Bearer ${freshToken}` },
      });

      const data = await r.json();
      if (!r.ok) {
        setErr(JSON.stringify(data, null, 2));
        return;
      }

      setMe(data);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  };

  const uploadFiles = async (selected: FileList) => {
    setErr("");

    try {
      if (!selected || selected.length === 0) {
        setErr("No files selected");
        return;
      }

      const freshToken = await getFreshIdToken();

      const formData = new FormData();
      Array.from(selected).forEach((f) => formData.append("files", f)); // MUST be "files"

      const r = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${freshToken}` },
        body: formData,
      });

      const data = await r.json();
      if (!r.ok) {
        setErr(JSON.stringify(data, null, 2));
        return;
      }

      await fetchFiles(freshToken);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  };

  // IMPORTANT: keep slashes in objectName for FastAPI {path} param.
  const encodeObjectNameForPath = (objectName: string) =>
    encodeURIComponent(objectName).replaceAll("%2F", "/");

  const downloadFile = async (objectName: string, filenameForSave?: string) => {
    setErr("");

    try {
      const pathObjectName = encodeObjectNameForPath(objectName);
      const freshToken = await getFreshIdToken();

      const r = await fetch(`${BACKEND_URL}/files/${pathObjectName}/download`, {
        headers: { Authorization: `Bearer ${freshToken}` },
      });

      const data = await r.json();
      if (!r.ok) {
        setErr(JSON.stringify(data, null, 2));
        return;
      }

      const signedUrl = data.url as string;

      const a = document.createElement("a");
      a.href = signedUrl;
      if (filenameForSave) a.download = filenameForSave;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  };
const deleteFile = async (objectName: string) => {
  setErr("");

  try {
    const ok = confirm("Delete this file?");
    if (!ok) return;

    const pathObjectName = encodeObjectNameForPath(objectName);
    const freshToken = await getFreshIdToken();

    const r = await fetch(`${BACKEND_URL}/files/${pathObjectName}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${freshToken}` },
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(JSON.stringify(data, null, 2));
      return;
    }

    await fetchFiles(freshToken);
  } catch (e: any) {
    setErr(String(e?.message ?? e));
  }
};


  const myFiles = useMemo(() => files.filter((f) => f.uid === myUid), [files, myUid]);
  const allUsersFiles = useMemo(() => files, [files]);

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Cortex File Manager</h1>

      <div style={{ marginBottom: 16 }}>
        <button onClick={login}>Login with Google</button>
        <button onClick={logout} style={{ marginLeft: 8 }}>
          Logout
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button onClick={callMe} disabled={!token}>
          Call /me
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="file"
          multiple
          disabled={!token}
          onChange={(e) => {
            if (e.target.files) {
              uploadFiles(e.target.files);
              e.currentTarget.value = "";
            }
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <b>Has token?</b> {token ? "YES" : "NO"}{" "}
        {isAdmin && <span style={{ color: "green" }}>(ADMIN)</span>}
      </div>

      {err && <pre style={{ color: "crimson" }}>{err}</pre>}
      {me && <pre>{JSON.stringify(me, null, 2)}</pre>}

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            Search:{" "}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={!token}
              placeholder="filename"
            />
          </label>

          <label>
            Type:{" "}
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value as FileType)}
              disabled={!token}
            >
              <option value="">All</option>
              <option value="txt">txt</option>
              <option value="json">json</option>
              <option value="pdf">pdf</option>
            </select>
          </label>

          <label>
            Sort by:{" "}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              disabled={!token}
            >
              <option value="date">date</option>
              <option value="size">size</option>
            </select>
          </label>

          <label>
            Order:{" "}
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as Order)}
              disabled={!token}
            >
              <option value="desc">desc</option>
              <option value="asc">asc</option>
            </select>
          </label>

          <button
            onClick={() => {
              setQ("");
              setFileType("");
              setSortBy("date");
              setOrder("desc");
            }}
            disabled={!token}
          >
            Reset
          </button>

          <button onClick={() => fetchFiles(token)} disabled={!token || loadingFiles}>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>My files</h3>

        {loadingFiles && <div>Loading...</div>}
        {!loadingFiles && myFiles.length === 0 && <div>No files yet</div>}

        <ul>
          {myFiles.map((f) => (
           <li key={f.object_name} style={{ display: "flex", gap: 8, alignItems: "center" }}>
  <span>{cleanName(f)}</span>

  <button onClick={() => downloadFile(f.object_name, cleanName(f))} disabled={!token}>
    Download
  </button>

  <button onClick={() => deleteFile(f.object_name)} disabled={!token}>
    Delete
  </button>
</li>

          ))}
        </ul>
      </div>

      {isAdmin && (
        <div style={{ marginTop: 32 }}>
          <h3>All users files (Admin view - read only)</h3>

          {!loadingFiles && allUsersFiles.length === 0 && <div>No files yet</div>}

          <ul>
            {allUsersFiles.map((f) => (
              <li key={f.object_name}>
                {cleanName(f)} <span style={{ opacity: 0.6 }}>(owner: {f.uid})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
