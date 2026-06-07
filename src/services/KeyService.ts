import api from '@/services/Api';
import { CryptoService } from '@/services/CryptoService';
import { socketService } from '@/services/SocketService';
import { useCryptoStore } from '@/stores/cryptoStore';
import { useAuthStore } from '@/stores/authStore';
import type { ID } from '@/types/utilityTypes';

interface CachedCK {
  key: CryptoKey;
  version: number;
}

type ContextType = 'chat' | 'cluster';

class KeyService {
  private ckCache = new Map<string, CachedCK>();

  private cKey(contextType: ContextType, contextId: ID): string {
    return `${contextType}:${contextId}`;
  }

  evict(contextType: ContextType, contextId: ID): void {
    this.ckCache.delete(this.cKey(contextType, contextId));
  }

  clearAll(): void {
    this.ckCache.clear();
  }

  getCachedKey(contextType: ContextType, contextId: ID): CachedCK | undefined {
    return this.ckCache.get(this.cKey(contextType, contextId));
  }

  async getConversationKey(
    contextType: ContextType,
    contextId: ID,
    memberIds?: ID[]
  ): Promise<CachedCK> {
    const k = this.cKey(contextType, contextId);
    const hit = this.ckCache.get(k);
    if (hit) return hit;

    const privateKey = useCryptoStore.getState().privateKey;
    if (!privateKey) throw new Error('Private key not unlocked');

    try {
      const res = await api.get<{ encrypted_key: string; key_version: number }>(
        `/keys/conversation?context_type=${contextType}&context_id=${contextId}`
      );
      if (!res) throw Object.assign(new Error('empty response'), { status: 500 });

      const rawCK = await CryptoService.rsaDecrypt(privateKey, res.encrypted_key);
      const ck = await CryptoService.importConversationKey(rawCK);
      const entry: CachedCK = { key: ck, version: res.key_version };
      this.ckCache.set(k, entry);
      return entry;
    } catch (err: any) {
      if (err?.status === 404) {
        const code = err?.data?.code ?? err?.code;
        if (code === 'KEY_PENDING') {
          // Key exists for context but not yet deposited for this user — request from owner
          const myUserId = useAuthStore.getState().user?._id;
          if (myUserId) {
            socketService.emit('key_deposit_requested', {
              context_type: contextType,
              context_id: contextId,
              user_id: myUserId,
            });
          }
          return null as unknown as CachedCK;
        }
        // NO_KEY: no envelope exists at all — generate and deposit
        if (!memberIds?.length)
          throw Object.assign(
            new Error('No CK found and no memberIds provided to create one'),
            { status: 404 }
          );
        return this._generateAndDeposit(contextType, contextId, memberIds);
      }
      throw err;
    }
  }

  private async _generateAndDeposit(
    contextType: ContextType,
    contextId: ID,
    memberIds: ID[]
  ): Promise<CachedCK> {
    const ck = await CryptoService.generateConversationKey();
    const raw = await CryptoService.exportRawKey(ck);

    const keys = await Promise.all(
      memberIds.map(async (userId) => {
        const res = await api.get<{ public_key: string }>(
          `/keys/identity/${userId}`
        );
        if (!res) throw new Error(`No public key for user ${userId}`);
        const pub = await CryptoService.importPublicKey(res.public_key);
        const encryptedKey = await CryptoService.rsaEncrypt(pub, raw);
        return { user_id: userId, encrypted_key: encryptedKey, key_version: 1 };
      })
    );

    await api.post('/keys/conversation', {
      body: { context_type: contextType, context_id: contextId, keys },
    });

    const entry: CachedCK = { key: ck, version: 1 };
    this.ckCache.set(this.cKey(contextType, contextId), entry);
    return entry;
  }

  async depositKeyForUser(
    contextType: ContextType,
    contextId: ID,
    newUserId: ID
  ): Promise<void> {
    let entry: CachedCK;
    try {
      entry = await this.getConversationKey(contextType, contextId);
    } catch {
      return;
    }

    const raw = await CryptoService.exportRawKey(entry.key);
    const res = await api.get<{ public_key: string }>(
      `/keys/identity/${newUserId}`
    );
    if (!res) return;

    const pub = await CryptoService.importPublicKey(res.public_key);
    const encryptedKey = await CryptoService.rsaEncrypt(pub, raw);

    await api.post('/keys/conversation', {
      body: {
        context_type: contextType,
        context_id: contextId,
        keys: [
          {
            user_id: newUserId,
            encrypted_key: encryptedKey,
            key_version: entry.version,
          },
        ],
      },
    });
  }

  async rotateClusterKey(
    clusterId: ID,
    remainingMemberIds: ID[]
  ): Promise<void> {
    const k = this.cKey('cluster', clusterId);
    const old = this.ckCache.get(k);
    const newVersion = (old?.version ?? 1) + 1;

    const newCK = await CryptoService.generateConversationKey();
    const raw = await CryptoService.exportRawKey(newCK);

    const keys = await Promise.all(
      remainingMemberIds.map(async (userId) => {
        const res = await api.get<{ public_key: string }>(
          `/keys/identity/${userId}`
        );
        if (!res) throw new Error(`No public key for user ${userId}`);
        const pub = await CryptoService.importPublicKey(res.public_key);
        const encryptedKey = await CryptoService.rsaEncrypt(pub, raw);
        return { user_id: userId, encrypted_key: encryptedKey };
      })
    );

    await api.post('/keys/rotate', {
      body: { cluster_id: clusterId, new_key_version: newVersion, keys },
    });

    this.ckCache.set(k, { key: newCK, version: newVersion });
  }
}

export const keyService = new KeyService();
