const categoryTranslations: Record<string, string> = {
  modeling_agency: 'Modelagentur',
  talent_agency: 'Talentagentur',
  model_portfolio_studio: 'Model-Portfolio-Studio',
  modeling_school: 'Model-Schule',
  fashion_designer: 'Modedesigner',
  photography_studio: 'Fotostudio',
  photography_service: 'Fotografieservice',
  beauty_salon: 'Schönheitssalon',
  fashion_accessories_store: 'Mode-Accessoires-Laden',
  health_and_beauty_shop: 'Gesundheits- und Schönheitsladen',
  beauty_supply_store: 'Beauty-Versorgungsladen',
  bathroom_remodeler: 'Badezimmer-Renovierer',
  kitchen_remodeler: 'Küchen-Renovierer',
  remodeler: 'Renovierer',
  beauty_product_supplier: 'Beauty-Produktlieferant',
  health_and_beauty: 'Gesundheit und Schönheit',
  beauty_school: 'Beauty-Schule',
  photography: 'Fotografie',
  beauty_products_wholesaler: 'Beauty-Produkt-Großhändler',
  haute_couture_fashion_house: 'Haute-Couture-Modehaus',
  fashion_design_school: 'Modedesign-Schule',
  scale_model_shop: 'Modellbau-Laden',
  beauty_products_vending_machine: 'Beauty-Produkt-Automat',
  architectural_and_engineering_model_maker: 'Architektur- und Ingenieurmodellbauer',
  photography_class: 'Fotografie-Kurs',
  model_design_company: 'Modell-Design-Unternehmen',
  photography_school: 'Fotografie-Schule',
  beauty: 'Schönheit',
  scale_model_club: 'Modellbau-Verein',
  model_train_store: 'Modelleisenbahn-Laden',
  model_builder: 'Modellbauer',
  aeromodel_shop: 'Flugmodell-Laden',
  model_car_play_area: 'Modellauto-Spielfläche',
  fashion: 'Mode',
  three_d_modeling: '3D-Modellierung',
  natural_beauty_spot: 'Naturschönheit',
}

function formatCategoryName(categoryName: string): string {
  return categoryName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function translateCategory(categoryName: string): string {
  const normalized = categoryName.toLowerCase().trim()
  
  if (categoryTranslations[normalized]) {
    return categoryTranslations[normalized]
  }
  
  return formatCategoryName(categoryName)
}
