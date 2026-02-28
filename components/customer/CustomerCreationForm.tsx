import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface CustomerFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface CustomerCreationFormProps {
  form: CustomerFormState;
  onChange: (form: CustomerFormState) => void;
  onCancel: () => void;
  onCreate: () => void;
}

export function CustomerCreationForm({ form, onChange, onCancel, onCreate }: CustomerCreationFormProps) {
  return (
    <>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input 
              id="firstName" 
              value={form.first_name} 
              onChange={(e) => onChange({...form, first_name: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input 
              id="lastName" 
              value={form.last_name} 
              onChange={(e) => onChange({...form, last_name: e.target.value})} 
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email"
            value={form.email} 
            onChange={(e) => onChange({...form, email: e.target.value})} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input 
            id="phone" 
            type="tel"
            value={form.phone} 
            onChange={(e) => onChange({...form, phone: e.target.value})} 
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel} className="cursor-pointer">Cancel</Button>
        <Button onClick={onCreate} disabled={!form.first_name.trim()} className="cursor-pointer">Create</Button>
      </DialogFooter>
    </>
  );
}
