"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { archestraApiTypes } from "@shared";
import { EnvironmentVariableSchema } from "@shared";
import { Loader2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import Editor from "@monaco-editor/react";
import { EnvironmentVariablesFormField } from "@/components/environment-variables-form-field";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JsonArrayTextarea } from "./json-array-textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogForm,
  DialogHeader,
  DialogStickyFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateMcpServerInstallationRequest } from "@/lib/mcp/mcp-server-installation-request.query";

const customServerRequestSchema = z
  .object({
    serverType: z.enum(["remote", "local"]),
    label: z.string().min(1, "Display name is required"),
    name: z.string().min(1, "Technical name is required"),
    version: z.string().optional(),
    serverUrl: z.string().optional(),
    docsUrl: z.string().optional(),
    command: z.string().optional(),
    arguments: z.array(z.string()).default([]),
    environment: z.array(EnvironmentVariableSchema),
    requestReason: z.string(),
  })
  .refine(
    (data) => {
      if (data.serverType === "local") {
        return data.command && data.command.trim().length > 0;
      }
      return true;
    },
    {
      message: "Command is required for local servers",
      path: ["command"],
    },
  );

type CustomServerRequestFormValues = z.infer<typeof customServerRequestSchema>;

export function CustomServerRequestDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const form = useForm<CustomServerRequestFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: Version mismatch between @hookform/resolvers and Zod
    resolver: zodResolver(customServerRequestSchema as any),
    defaultValues: {
      serverType: "remote",
      label: "",
      name: "",
      version: "",
      serverUrl: "",
      docsUrl: "",
      command: "",
      arguments: [],
      environment: [],
      requestReason: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "environment",
  });

  const createRequest = useCreateMcpServerInstallationRequest();

  const onSubmit = async (values: CustomServerRequestFormValues) => {
    const customServerConfig: NonNullable<
      archestraApiTypes.CreateMcpServerInstallationRequestData["body"]["customServerConfig"]
    > =
      values.serverType === "remote"
        ? {
            type: "remote" as const,
            label: values.label,
            name: values.name,
            version: values.version || undefined,
            serverType: "remote" as const,
            serverUrl: values.serverUrl || undefined,
            docsUrl: values.docsUrl || undefined,
            userConfig: undefined,
            oauthConfig: undefined,
          }
        : {
            type: "local" as const,
            label: values.label,
            name: values.name,
            version: values.version || undefined,
            serverType: "local" as const,
            localConfig: {
              command: values.command,
              arguments:
                values.arguments.length > 0 ? values.arguments : undefined,
              environment:
                values.environment.length > 0 ? values.environment : undefined,
            },
          };

    await createRequest.mutateAsync({
      externalCatalogId: null,
      requestReason: values.requestReason,
      customServerConfig,
    });

    form.reset();
    onClose();
  };

  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleJsonChange = (value: string | undefined) => {
    if (!value) return;
    try {
      const parsed = JSON.parse(value);
      const result = customServerRequestSchema.safeParse(parsed);
      if (result.success) {
        form.reset(result.data, { keepDirty: true });
        setJsonError(null);
      } else {
        setJsonError("JSON does not match the required schema.");
      }
    } catch (e) {
      setJsonError("Invalid JSON format.");
    }
  };

  const isFormValid = form.formState.isValid;
  const disableSubmit = createRequest.isPending || !isFormValid || !!jsonError;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Custom MCP Server Installation</DialogTitle>
          <DialogDescription>
            Request a custom MCP server to be added to your organization's
            internal registry. An admin will review your request.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <DialogForm onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="form" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="form">Form</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
              
              <TabsContent value="form" className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="serverType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Server Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select server type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="local">Local</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="My Custom MCP Server" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Technical Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="my-custom-server" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version</FormLabel>
                      <FormControl>
                        <Input placeholder="1.0.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("serverType") === "remote" && (
                <>
                  <FormField
                    control={form.control}
                    name="serverUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Server URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/mcp"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="docsUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Documentation URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/docs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {form.watch("serverType") === "local" && (
                <>
                  <FormField
                    control={form.control}
                    name="command"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Command *</FormLabel>
                        <FormControl>
                          <Input placeholder="node" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="arguments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arguments (JSON array)</FormLabel>
                        <FormControl>
                          <JsonArrayTextarea
                            placeholder={`[\n  "--verbose"\n]`}
                            rows={3}
                            className="font-mono"
                            value={field.value}
                            onChange={field.onChange}
                            onInvalid={(invalid) => {
                              if (invalid) {
                                form.setError("arguments", { message: "Invalid JSON array" });
                              } else {
                                form.clearErrors("arguments");
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <EnvironmentVariablesFormField
                    control={form.control}
                    fields={fields}
                    append={append}
                    remove={remove}
                    fieldNamePrefix="environment"
                    form={form}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="requestReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Reason for Request{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why your team needs this custom MCP server..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </TabsContent>
              <TabsContent value="json" className="py-4">
                <div className="border rounded-md overflow-hidden flex flex-col">
                  <Editor
                    height="400px"
                    defaultLanguage="json"
                    value={JSON.stringify(form.watch(), null, 2)}
                    onChange={handleJsonChange}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      formatOnPaste: true,
                    }}
                  />
                  {jsonError && (
                    <div className="bg-destructive/10 text-destructive p-3 text-sm border-t">
                      {jsonError}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogStickyFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={disableSubmit}>
                {createRequest.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Submit Request
              </Button>
            </DialogStickyFooter>
          </DialogForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
