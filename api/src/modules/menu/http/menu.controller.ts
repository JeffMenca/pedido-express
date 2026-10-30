import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MenuService } from '../application/menu.service';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOkResponse({
    description:
      'Sellable menu grouped by category, plus sellable combos and active modifiers. Amounts in cents.',
  })
  getMenu() {
    return this.menuService.getSellableMenu();
  }
}
