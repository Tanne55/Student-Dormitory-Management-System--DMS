import { DataSource } from 'typeorm';
import { Building } from '../src/modules/buildings/entities/building.entity';
import { Floor } from '../src/modules/buildings/entities/floor.entity';

export async function seedBuildingAndFloor(ds: DataSource): Promise<{ building: Building; floor: Floor }> {
  const building = await ds.getRepository(Building).save(
    ds.getRepository(Building).create({ code: 'E2E', name: 'E2E Building', address: null }),
  );
  const floor = await ds.getRepository(Floor).save(
    ds.getRepository(Floor).create({ buildingId: building.id, floorNumber: 1, label: 'T1' }),
  );
  return { building, floor };
}
