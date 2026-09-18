import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/utils/trpc";

export function useRestoreRecipe() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.recipes.restore.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Recipe restored to its collection.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
}
