import { ApprovalDocument, DemoUser, Role } from "./types";

export const DOCUMENTS_KEY = "approval_demo_documents";
export const CURRENT_USER_KEY = "approval_demo_current_user";

const DB_NAME = "approval_demo";
const DB_VERSION = 1;
const DOCUMENTS_STORE = "documents";
const defaultUser: DemoUser = { role: "hro", name: "Nhân sự Demo" };

let databasePromise: Promise<IDBDatabase> | undefined;
let migrationPromise: Promise<void> | undefined;

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Không thể truy cập IndexedDB."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Không thể lưu dữ liệu."));
    transaction.onabort = () => reject(transaction.error || new Error("Giao dịch lưu dữ liệu đã bị hủy."));
  });
}

function openDatabase() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB chỉ khả dụng trên trình duyệt."));
  }

  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(DOCUMENTS_STORE)) {
          database.createObjectStore(DOCUMENTS_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Không thể mở IndexedDB."));
    });
  }

  return databasePromise;
}

async function migrateLocalStorage() {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    const raw = localStorage.getItem(DOCUMENTS_KEY);
    if (!raw) return;

    let documents: ApprovalDocument[];
    try {
      documents = JSON.parse(raw);
    } catch {
      return;
    }

    const database = await openDatabase();
    const transaction = database.transaction(DOCUMENTS_STORE, "readwrite");
    const store = transaction.objectStore(DOCUMENTS_STORE);
    documents.forEach((document) => store.put(document));
    await transactionDone(transaction);
    localStorage.removeItem(DOCUMENTS_KEY);
  })();

  return migrationPromise;
}

async function getStore(mode: IDBTransactionMode) {
  await migrateLocalStorage();
  const database = await openDatabase();
  const transaction = database.transaction(DOCUMENTS_STORE, mode);
  return { store: transaction.objectStore(DOCUMENTS_STORE), transaction };
}

export function getCurrentUser(): DemoUser {
  if (typeof window === "undefined") return defaultUser;
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : defaultUser;
}

export function setCurrentUser(role: Role) {
  const names: Record<Role, string> = {
    hro: "Nhân sự Demo",
    accountant: "Kế toán viên Demo",
    chief_accountant: "Kế toán trưởng Demo",
    cfo: "CFO Demo",
    admin: "Admin Demo",
  };
  const user = { role, name: names[role] };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}

export async function getDocuments(): Promise<ApprovalDocument[]> {
  if (typeof window === "undefined") return [];
  const { store } = await getStore("readonly");
  const documents = await requestResult(store.getAll() as IDBRequest<ApprovalDocument[]>);
  return documents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDocument(id: string) {
  const { store } = await getStore("readonly");
  return requestResult(store.get(id) as IDBRequest<ApprovalDocument | undefined>);
}

export async function saveDocument(document: ApprovalDocument) {
  const { store, transaction } = await getStore("readwrite");
  store.put(document);
  await transactionDone(transaction);
  window.dispatchEvent(new Event("approval-storage-updated"));
}

export async function clearDemoData() {
  const { store, transaction } = await getStore("readwrite");
  store.clear();
  await transactionDone(transaction);
  localStorage.removeItem(DOCUMENTS_KEY);
  window.dispatchEvent(new Event("approval-storage-updated"));
}
