import {
  Button,
  Checkbox,
  Flex,
  Spinner,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { reportApi } from "../api/client";
import { StitchCard } from "../components/atoms/StitchCard";
import { useOfficer } from "../state/OfficerContext";

export function ReportPage() {
  const toast = useToast();
  const { activeTenderId } = useOfficer();

  const [includeAuditTrail, setIncludeAuditTrail] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadAvailable, setDownloadAvailable] = useState(false);

  // Cleanup object URLs.
  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const handleGenerate = async () => {
    if (!activeTenderId) return;
    setIsGenerating(true);
    setDownloadAvailable(false);

    try {
      await reportApi.generate({
        tender_id: activeTenderId,
        include_audit_trail: includeAuditTrail,
      });
      toast({ status: "success", title: "Report generation triggered" });

      // Poll for availability (the backend may return 404 until PDF is ready).
      for (let i = 0; i < 10; i++) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 5000));
        try {
          // eslint-disable-next-line no-await-in-loop
          const res = await reportApi.download(activeTenderId);
          const blob = res.data as Blob;
          const url = URL.createObjectURL(blob);
          setDownloadUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setDownloadAvailable(true);
          return;
        } catch (e) {
          // keep polling
        }
      }

      toast({
        status: "warning",
        title: "Report not ready yet (try again).",
      });
    } catch {
      toast({ status: "error", title: "Failed to trigger report generation" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Stack spacing={6}>
      <StitchCard>
        <Stack spacing={4}>
          <Text fontWeight={900} fontSize="16px">
            Final Report
          </Text>
          <Checkbox
            isChecked={includeAuditTrail}
            onChange={(e) => setIncludeAuditTrail(e.target.checked)}
          >
            Include audit trail
          </Checkbox>

          <Flex gap={3} justify="flex-end" align="center" wrap="wrap">
            <Button
              variant="primary"
              onClick={handleGenerate}
              isDisabled={!activeTenderId || isGenerating}
            >
              {isGenerating ? <Spinner size="sm" mr={2} /> : null}
              Generate
            </Button>

            {downloadAvailable && downloadUrl ? (
              <Button
                as="a"
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                variant="secondary"
              >
                Download PDF
              </Button>
            ) : null}
          </Flex>
        </Stack>
      </StitchCard>
    </Stack>
  );
}

