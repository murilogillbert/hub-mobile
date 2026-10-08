import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { api } from '@/api/client';
import { qk } from '@/api/queryKeys';
import type { RedeemResult } from '@/api/types';

/** Unidade escolhida no balcão. O tablete é sempre da mesma loja. */
const CHAVE_UNIDADE = 'odh.balcao.unidade';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { AppText, Badge, Card, Divider, KeyValue } from '@/components/ui/primitives';
import { formatCurrency } from '@/lib/format';
import { alertError } from '@/lib/recovery';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * Balcão da loja: lê o QR do cliente (ou aceita o código digitado), mostra o que será resgatado e
 * só então efetiva. São dois passos de propósito — `confirm=false` consulta, `confirm=true` baixa o
 * voucher. Resgatar por engano não tem desfazer no app.
 */
export default function ValidarVoucher() {
  const toast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<RedeemResult | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Unidade que está atendendo.
   *
   * Opcional de propósito, e não só porque o servidor aceita sem: uma loja de uma unidade só
   * não deveria ter de escolher nada. Com mais de uma, a escolha é o que permite baixar a
   * contagem da unidade certa e registrar quem atendeu — informação que antes não existia.
   *
   * Fica no aparelho (`AsyncStorage`): o tablete do balcão é sempre da mesma loja, e perguntar
   * a cada voucher seria atrito num gesto que se repete o dia inteiro.
   */
  const unidades = useQuery({
    queryKey: qk.partnerStores,
    queryFn: () => api.partner.stores(),
  });
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(CHAVE_UNIDADE).then((v) => {
      if (v) setStoreId(v);
    });
  }, []);

  const lista = unidades.data ?? [];
  /**
   * Com uma unidade só, ela é escolhida sozinha e o seletor não aparece.
   *
   * Não é atalho de interface: pedir para o lojista de uma loja escolher "qual loja" é a
   * pergunta que ele não entende.
   */
  const unidadeEfetiva = lista.length === 1 ? lista[0]!.id : storeId;

  const escolher = (id: string | null) => {
    setStoreId(id);
    if (id) void AsyncStorage.setItem(CHAVE_UNIDADE, id);
    else void AsyncStorage.removeItem(CHAVE_UNIDADE);
  };

  const lookup = async (raw: string) => {
    const clean = raw.trim().toUpperCase();
    if (!clean) return;
    setScanning(false);
    setCode(clean);
    setBusy(true);
    try {
      // A consulta não precisa da unidade: ela não muda nada, só mostra o que será resgatado.
      setPreview(await api.partner.redeem(clean, false));
    } catch (err) {
      setPreview(null);
      alertError(err, 'Código não encontrado');
    } finally {
      setBusy(false);
    }
  };

  const confirmRedeem = async () => {
    setBusy(true);
    try {
      const done = await api.partner.redeem(code, true, unidadeEfetiva ?? undefined);
      setPreview(done);
      toast.success('Voucher resgatado.');
    } catch (err) {
      alertError(err, 'Não foi possível resgatar');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setCode('');
  };

  if (scanning) {
    return (
      <View style={styles.scanner}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => void lookup(data)}
        />
        <View style={styles.scannerFooter}>
          <AppText variant="bodyStrong" center color={colors.white}>
            Aponte para o QR do cliente
          </AppText>
          <Button title="Cancelar" variant="outline" onPress={() => setScanning(false)} />
        </View>
      </View>
    );
  }

  return (
    <Screen
      footer={
        preview && !preview.redeemed ? (
          <>
            <Button title="Confirmar resgate" size="lg" loading={busy} onPress={confirmRedeem} />
            <Button title="Cancelar" variant="ghost" onPress={reset} />
          </>
        ) : preview?.redeemed ? (
          <Button title="Validar outro" size="lg" onPress={reset} />
        ) : (
          <Button
            title="Ler QR do cliente"
            size="lg"
            icon="qr-code-outline"
            loading={busy}
            onPress={async () => {
              if (!permission?.granted) {
                const res = await requestPermission();
                if (!res.granted) {
                  toast.error('Precisamos da câmera para ler o QR.');
                  return;
                }
              }
              setScanning(true);
            }}
          />
        )
      }
    >
      {!preview ? (
        <>
          <AppText variant="small">Leia o QR que o cliente mostra no app dele, ou digite o código do pedido.</AppText>

          {/*
            Seletor só com duas ou mais unidades. Com uma, a escolha é automática; com nenhuma,
            o resgate segue sem unidade, exatamente como antes.
          */}
          {lista.length > 1 && (
            <Card style={{ gap: spacing.xs }}>
              <AppText variant="label">Qual unidade está atendendo</AppText>
              <View style={styles.unidades}>
                {lista.map((u) => {
                  const ativa = unidadeEfetiva === u.id;
                  return (
                    <Pressable
                      key={u.id}
                      onPress={() => escolher(ativa ? null : u.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: ativa }}
                      style={[styles.chip, ativa && styles.chipAtivo]}
                    >
                      <AppText variant="small" color={ativa ? colors.white : colors.text}>
                        {u.name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              <AppText variant="small">
                {unidadeEfetiva
                  ? 'O resgate baixa a contagem desta unidade e registra quem atendeu.'
                  : 'Sem escolher, o resgate não baixa a contagem de nenhuma unidade.'}
              </AppText>
            </Card>
          )}
          <TextField
            label="Código do pedido"
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => void lookup(code)}
          />
          <Button title="Buscar código" variant="outline" disabled={!code.trim()} loading={busy} onPress={() => void lookup(code)} />
        </>
      ) : (
        <Card style={{ gap: spacing.sm }}>
          {preview.redeemed ? <Badge label="Resgatado" tone="success" icon="checkmark-circle-outline" /> : <Badge label="Confira antes de confirmar" tone="warning" />}
          <AppText variant="subtitle">{preview.productTitle}</AppText>
          <AppText variant="small">Cliente: {preview.customerName}</AppText>
          <Divider />
          <KeyValue label="Valor pago" value={formatCurrency(preview.paidPrice)} />
          <KeyValue label={`Taxa da plataforma (${preview.feePercent}%)`} value={`- ${formatCurrency(preview.platformFee)}`} />
          <KeyValue label="Cashback do cliente" value={`- ${formatCurrency(preview.customerCashback)}`} />
          <Divider />
          <KeyValue label="Você recebe" value={formatCurrency(preview.partnerNet)} strong valueColor={colors.success} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  unidades: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipAtivo: { backgroundColor: colors.navy, borderColor: colors.navy },
  scanner: { flex: 1, backgroundColor: colors.navy },
  scannerFooter: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xxl,
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.overlay,
  },
});
