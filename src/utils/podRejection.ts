const POD_CORRECTION_INSTRUCTIONS: Record<string, string> = {
  'Photo incorrecte': 'Prenez une nouvelle photo nette montrant la livraison chez le client.',
  'Signature manquante': 'Faites signer à nouveau le réceptionnaire dans la zone de signature.',
  'Informations incorrectes': 'Corrigez le nom du réceptionnaire et les remarques avant le renvoi.',
  'Produit endommagé': 'Ajoutez une photo claire du produit et précisez son état dans les remarques.',
  'Localisation incohérente': 'Reprenez la preuve sur le lieu de livraison afin d’enregistrer la bonne position GPS.',
  Autre: 'Suivez la précision indiquée par le superviseur avant de renvoyer la preuve.',
};

export const getPodCorrectionInstruction = (reason?: string) =>
  (reason && POD_CORRECTION_INSTRUCTIONS[reason]) ||
  'Vérifiez la photo, la signature et les informations avant de renvoyer la preuve.';
