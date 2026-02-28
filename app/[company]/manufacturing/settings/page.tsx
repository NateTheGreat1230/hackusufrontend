"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, FileText, Loader2, Edit2, X } from "lucide-react";
import { ManufacturingStepTemplate } from "@/types";
import { useDialog } from "@/lib/dialog-context";

interface Template {
  id: string;
  name: string;
  description?: string;
  steps: ManufacturingStepTemplate[];
}

export default function ManufacturingSettingsPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const [paramsData, setParamsData] = useState<{ company: string } | null>(null);
  const { confirm } = useDialog();
  // but following pattern:
  const [resolvedParams, setResolvedParams] = useState<{ company: string } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create/Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [steps, setSteps] = useState<ManufacturingStepTemplate[]>([]);
  const [newStepDesc, setNewStepDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!resolvedParams) return;
    const q = query(collection(db, "manufacturing_templates"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Template[]);
      setLoading(false);
    });
    return () => unsub();
  }, [resolvedParams]);

  const handleEdit = (tmpl: Template) => {
      setTemplateName(tmpl.name);
      setTemplateDesc(tmpl.description || "");
      setSteps(tmpl.steps || []);
      setCurrentTemplateId(tmpl.id);
      setIsEditing(true);
  };

  const handleCreate = () => {
      setTemplateName("");
      setTemplateDesc("");
      setSteps([]);
      setCurrentTemplateId(null);
      setIsEditing(true);
  };

  const handleCancel = () => {
      setIsEditing(false);
      setCurrentTemplateId(null);
  };

  const addStep = () => {
      if (!newStepDesc.trim()) return;
      setSteps([...steps, { description: newStepDesc }]);
      setNewStepDesc("");
  };

  const removeStep = (index: number) => {
      const newSteps = [...steps];
      newSteps.splice(index, 1);
      setSteps(newSteps);
  };

  const handleSave = async () => {
      if (!templateName.trim() || !resolvedParams) return;
      setIsSaving(true);
      try {
          const data = {
              name: templateName,
              description: templateDesc,
              steps: steps,
              time_updated: serverTimestamp()
          };

          if (currentTemplateId) {
             await updateDoc(doc(db, "manufacturing_templates", currentTemplateId), data);
          } else {
             await addDoc(collection(db, "manufacturing_templates"), {
                 ...data,
                 company: doc(db, "companies", resolvedParams.company),
                 time_created: serverTimestamp()
             });
          }
          setIsEditing(false);
      } catch (error) {
          console.error("Error saving template:", error);
      } finally {
          setIsSaving(false);
      }
  };
  
  const handleDelete = async (id: string) => {
      if (!await confirm("Delete this template?")) return;
      await deleteDoc(doc(db, "manufacturing_templates", id));
  };

  if (!resolvedParams || loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="flex flex-col space-y-6 p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manufacturing Settings</h2>
          <p className="text-muted-foreground">Manage manufacturing process templates.</p>
        </div>
        {!isEditing && (
            <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" /> New Template
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="md:col-span-1 space-y-4">
            {templates.map(tmpl => (
                <Card 
                    key={tmpl.id} 
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${currentTemplateId === tmpl.id ? 'border-primary' : ''}`}
                    onClick={() => handleEdit(tmpl)}
                >
                    <CardHeader className="p-4">
                        <CardTitle className="text-base">{tmpl.name}</CardTitle>
                        {tmpl.description && <CardDescription className="line-clamp-2">{tmpl.description}</CardDescription>}
                        <div className="text-xs text-muted-foreground mt-2">
                           {tmpl.steps?.length || 0} steps
                        </div>
                    </CardHeader>
                </Card>
            ))}
            {templates.length === 0 && (
                <div className="text-center text-muted-foreground py-8 border rounded-lg border-dashed">
                    No templates found.
                </div>
            )}
        </div>

        {/* Editor */}
        <div className="md:col-span-2">
            {isEditing ? (
                <Card>
                    <CardHeader>
                        <CardTitle>{currentTemplateId ? 'Edit Template' : 'New Template'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Template Name</Label>
                            <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Standard PC Build" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} placeholder="Description of this process..." />
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                             <Label>Process Steps</Label>
                             <div className="flex gap-2">
                                <Input 
                                    value={newStepDesc} 
                                    onChange={e => setNewStepDesc(e.target.value)} 
                                    placeholder="Add step description..."
                                    onKeyDown={e => e.key === 'Enter' && addStep()}
                                />
                                <Button onClick={addStep} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
                             </div>
                             
                             <div className="space-y-2 mt-2 max-h-[300px] overflow-y-auto">
                                 {steps.map((step, idx) => (
                                     <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded border text-sm group">
                                         <div className="flex gap-2">
                                            <span className="font-mono text-muted-foreground text-xs pt-0.5">{idx + 1}.</span>
                                            <span>{step.description}</span>
                                         </div>
                                         <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => removeStep(idx)}>
                                             <Trash2 className="h-3 w-3" />
                                         </Button>
                                     </div>
                                 ))}
                                 {steps.length === 0 && <div className="text-center text-xs text-muted-foreground">No steps defined.</div>}
                             </div>
                        </div>

                        <div className="flex justify-between pt-4 border-t mt-4">
                            <Button variant="ghost" onClick={() => currentTemplateId && handleDelete(currentTemplateId)} className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={!currentTemplateId}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Save Template
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="h-full flex items-center justify-center border rounded-lg border-dashed text-muted-foreground p-12 bg-muted/10">
                    <div className="text-center space-y-2">
                        <FileText className="h-10 w-10 mx-auto opacity-50" />
                        <p>Select a template to edit or create a new one.</p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
