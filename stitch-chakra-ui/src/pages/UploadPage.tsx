import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { documentApi, tenderApi } from "../api/client";
import type { BidderResponse, StructuredDocumentObject, TenderResponse } from "../types/backend";
import { StatusBadge } from "../components/atoms/StatusBadge";
import { StitchCard } from "../components/atoms/StitchCard";
import { TenderSelector } from "../components/molecules/TenderSelector";
import { useOfficer } from "../state/OfficerContext";
import { StitchInput } from "../components/atoms/StitchInput";

export function UploadPage() {
  const toast = useToast();
  const { tenders, activeTenderId, setActiveTenderId, refreshTenders } = useOfficer();

  const [bidders, setBidders] = useState<BidderResponse[]>([]);
  const [documents, setDocuments] = useState<StructuredDocumentObject[]>([]);

  // Tender creation form
  const [tenderName, setTenderName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");

  // Bidder creation form
  const [bidderName, setBidderName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");

  // Upload form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBidderId, setUploadBidderId] = useState<string | null>(null);

  const selectedBidderId = useMemo(() => {
    return uploadBidderId === "" ? null : uploadBidderId;
  }, [uploadBidderId]);

  const bidderById = useMemo(() => {
    return Object.fromEntries(bidders.map((b) => [b.id, b.name]));
  }, [bidders]);

  const refreshBiddersAndDocs = async (tenderId: string) => {
    const [biddersRes, docsRes] = await Promise.all([
      tenderApi.listBidders(tenderId),
      documentApi.list(tenderId),
    ]);
    setBidders(biddersRes.data);
    setDocuments(docsRes.data);
  };

  useEffect(() => {
    if (!activeTenderId) return;
    refreshBiddersAndDocs(activeTenderId).catch(() => {
      toast({
        status: "error",
        title: "Failed to load bidders/documents",
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenderId]);

  const canUpload = Boolean(activeTenderId && uploadFile);

  const handleCreateTender = async () => {
    if (!tenderName.trim()) {
      toast({ status: "warning", title: "Tender name is required" });
      return;
    }

    try {
      const res = await tenderApi.create({
        name: tenderName.trim(),
        reference_number: referenceNumber.trim() || null,
        description: description.trim() || null,
        submission_deadline: submissionDeadline.trim() || null,
      });
      toast({ status: "success", title: "Tender created" });
      await refreshTenders();
      setActiveTenderId(res.data.id);
      setTenderName("");
      setReferenceNumber("");
      setDescription("");
      setSubmissionDeadline("");
    } catch (e) {
      toast({ status: "error", title: "Tender creation failed" });
    }
  };

  const handleAddBidder = async () => {
    if (!activeTenderId) return;
    if (!bidderName.trim()) {
      toast({ status: "warning", title: "Bidder name is required" });
      return;
    }

    try {
      await tenderApi.addBidder(activeTenderId, {
        name: bidderName.trim(),
        registration_number: registrationNumber.trim() || null,
      });
      toast({ status: "success", title: "Bidder added" });
      const biddersRes = await tenderApi.listBidders(activeTenderId);
      setBidders(biddersRes.data);
      setBidderName("");
      setRegistrationNumber("");
    } catch {
      toast({ status: "error", title: "Failed to add bidder" });
    }
  };

  const handleUpload = async () => {
    if (!activeTenderId || !uploadFile) return;
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("tender_id", activeTenderId);
      if (selectedBidderId) formData.append("bidder_id", selectedBidderId);

      await documentApi.upload(formData);
      toast({ status: "success", title: "Document uploaded" });
      const docsRes = await documentApi.list(activeTenderId);
      setDocuments(docsRes.data);
      setUploadFile(null);
    } catch {
      toast({ status: "error", title: "Upload failed" });
    }
  };

  return (
    <Stack spacing={6}>
      <StitchCard>
        <Stack spacing={3}>
          <Text fontWeight={900} fontSize="16px">
            Select Tender
          </Text>
          {tenders.length ? (
            <TenderSelector
              tenders={tenders}
              activeTenderId={activeTenderId}
              onSelect={(t: TenderResponse) => setActiveTenderId(t.id)}
            />
          ) : (
            <Text color="rgba(0,0,0,0.6)">No tenders yet. Create one below.</Text>
          )}
        </Stack>
      </StitchCard>

      <Flex gap={6} align="flex-start" wrap="wrap">
        <StitchCard flex="1 1 420px">
          <Stack spacing={4}>
            <Text fontWeight={900} fontSize="16px">
              Create Tender
            </Text>
            <Stack direction={{ base: "column", md: "row" }} spacing={3}>
              <StitchInput
                label="Tender Name"
                placeholder="e.g., Tender for Supply of X"
                value={tenderName}
                onChange={(e) => setTenderName(e.target.value)}
              />
              <StitchInput
                label="Reference Number"
                placeholder="Optional"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </Stack>
            <StitchInput
              label="Description"
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <StitchInput
              label="Submission Deadline"
              placeholder="Optional (string or ISO date)"
              value={submissionDeadline}
              onChange={(e) => setSubmissionDeadline(e.target.value)}
            />
            <Button variant="primary" onClick={handleCreateTender}>
              Create Tender
            </Button>
          </Stack>
        </StitchCard>

        <StitchCard flex="1 1 420px">
          <Stack spacing={4}>
            <Text fontWeight={900} fontSize="16px">
              Add Bidder
            </Text>
            {!activeTenderId ? (
              <Text color="rgba(0,0,0,0.6)">Select a tender first.</Text>
            ) : (
              <>
                <Stack spacing={3}>
                  <StitchInput
                    label="Bidder Name"
                    placeholder="e.g., ABC Traders"
                    value={bidderName}
                    onChange={(e) => setBidderName(e.target.value)}
                  />
                  <StitchInput
                    label="Registration Number"
                    placeholder="Optional"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                </Stack>
                <Button variant="primary" onClick={handleAddBidder}>
                  Add Bidder
                </Button>
              </>
            )}
          </Stack>
        </StitchCard>
      </Flex>

      <StitchCard>
        <Stack spacing={4}>
          <Text fontWeight={900} fontSize="16px">
            Upload Documents
          </Text>

          <Stack direction={{ base: "column", md: "row" }} spacing={3} align="center">
            <FormControl>
              <FormLabel>Select bidder (optional)</FormLabel>
              <Select
                value={selectedBidderId ?? ""}
                onChange={(e) => setUploadBidderId(e.target.value || null)}
              >
                <option value="">General tender document</option>
                {bidders.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>PDF / Image</FormLabel>
              <Input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/tiff"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </FormControl>

            <Button
              variant="primary"
              isDisabled={!canUpload}
              onClick={handleUpload}
              alignSelf="flex-end"
            >
              Upload
            </Button>
          </Stack>

          <Text fontWeight={900} fontSize="14px" pt={2}>
            Documents
          </Text>
          <Stack spacing={3}>
            {documents.length === 0 ? (
              <Text color="rgba(0,0,0,0.6)">No documents uploaded yet.</Text>
            ) : (
              documents.map((d) => (
                <Flex key={d.id} justify="space-between" align="center" gap={4}>
                  <Flex direction="column" minW={0}>
                    <Text fontWeight={800} noOfLines={1}>
                      {d.filename}
                    </Text>
                    <Text fontSize="12px" color="rgba(0,0,0,0.55)">
                      {d.bidder_id ? `Bidder: ${bidderById[d.bidder_id] || "Unknown"}` : "General"} • {d.file_type}
                    </Text>
                  </Flex>
                  <StatusBadge status={d.status} />
                </Flex>
              ))
            )}
          </Stack>
        </Stack>
      </StitchCard>
    </Stack>
  );
}

