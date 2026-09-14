export type Page<T> = {
  limit: number;
  offset: number;
  count: number;
  total: number;
  has_more: boolean;
  results: T[];
};

export type Listing = {
  listing_id: string;
  listing_url?: string | undefined;
  website?: string | undefined;
  city_id?: number | undefined;
  apartment_name: string;
  locality: string;
  property_type: string;
  bedroom: number;
  bathroom: number;
  balcony?: number | undefined;
  floor?: number | undefined;
  total_floors?: number | undefined;
  furnishing?: string | undefined;
  facing_direction?: string | undefined;
  covered_parking?: number | undefined;
  price: number;
  carpet_area: number;
  super_built_up_area?: number | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  posted_by?: string | undefined;
  posted_by_name?: string | undefined;
  posted_by_contact?: string | undefined;
  project_id?: string | null | undefined;
  is_verified?: boolean | undefined;
  description?: string | undefined;
  posted_at?: string | undefined;
  is_live?: boolean | undefined;
};

export type Rental = {
  listing_id: string;
  listing_url?: string | undefined;
  title?: string | undefined;
  apartment_name?: string | undefined;
  locality: string;
  property_type?: string | undefined;
  bedroom: number;
  bathroom?: number | undefined;
  floor?: number | undefined;
  total_floors?: number | undefined;
  furnishing?: string | undefined;
  facing_direction?: string | undefined;
  price: number;
  deposit?: number | undefined;
  maintenance?: number | undefined;
  carpet_area: number;
  super_builtup_area?: number | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  posted_by?: string | undefined;
  posted_by_name?: string | undefined;
  posted_by_contact?: string | undefined;
  description?: string | undefined;
  posted_at?: string | undefined;
  is_live?: boolean | undefined;
  website?: string | undefined;
};

export type Project = {
  project_id: string;
  project_url?: string | undefined;
  apartment_name: string;
  developer_name?: string | undefined;
  locality: string;
  project_status?: string | undefined;
  total_units?: number | undefined;
  total_towers?: number | undefined;
  total_floors?: number | undefined;
  launch_date?: string | undefined;
  possession_date?: string | undefined;
  rera_number?: string | undefined;
  min_area_sqft?: number | undefined;
  max_area_sqft?: number | undefined;
  amenities?: string[] | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  total_listings?: number | undefined;
  price_min?: number | undefined; // in crores
  price_max?: number | undefined; // in crores
};

export type Locality = { locality: string; listing_count: number };
